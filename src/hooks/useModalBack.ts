import { useEffect, useRef } from 'react';

/**
 * Hook to handle browser back button closing the modal instead of navigating back/exiting.
 * @param isOpen Boolean indicating if the modal is open
 * @param onClose Function to close the modal
 */
export function useModalBack(isOpen: boolean, onClose: () => void) {
    const closedByBack = useRef(false);

    useEffect(() => {
        if (isOpen) {
            closedByBack.current = false;
            // Push a dummy state so that the back button pops this instead of the real history
            window.history.pushState({ modalOpen: true }, '');

            const handlePopState = () => {
                closedByBack.current = true;
                onClose();
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
    }, [isOpen, onClose]); // ensuring onClose is stable is important used by caller
}
