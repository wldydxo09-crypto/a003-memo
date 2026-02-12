import { useEffect, useRef } from 'react';

/**
 * Hook to handle browser back button closing the modal instead of navigating back/exiting.
 * @param isOpen Boolean indicating if the modal is open
 * @param onClose Function to close the modal
 */
export function useModalBack(isOpen: boolean, onClose: () => void) {
    const closedByBack = useRef(false);
    const onCloseRef = useRef(onClose);

    // Always keep the ref updated with the latest callback
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            closedByBack.current = false;
            // Push a dummy state so that the back button pops this instead of the real history
            window.history.pushState({ modalOpen: true }, '');

            const handlePopState = () => {
                closedByBack.current = true;
                // Use the ref to call the latest close function without re-running the effect
                if (onCloseRef.current) {
                    onCloseRef.current();
                }
            };

            window.addEventListener('popstate', handlePopState);

            return () => {
                window.removeEventListener('popstate', handlePopState);
                // If the modal was closed via UI (not back button), we must pop the state we pushed
                if (!closedByBack.current) {
                    window.history.back();
                }
            };
        }
    }, [isOpen]); // onClose is intentionally omitted to prevent re-running on re-renders
}
