'use client';

// New Data Service for MongoDB API
// This will replace firebaseService calls in the components

const API_BASE = '/api';

export interface Comment {
    id: string; // uuid
    content: string;
    createdAt: string; // ISO date
    userId: string;
    userName?: string; // Optional display name
}

export interface HistoryItem {
    id?: string;
    _id?: string;
    userId: string;
    menuId: string;
    menuName: string;
    content: string;
    summary?: string | null;
    images: string[];
    status: 'pending' | 'in-progress' | 'completed';
    labels: string[];
    sheetName?: string | null;
    subMenuId?: string | null;
    emailSent?: boolean;
    triggerInfo?: string | null;
    calendarEventId?: string;
    priority?: 'normal' | 'high';
    comments?: Comment[]; // Added comments field
    createdAt?: string | Date; // API returns string, we might need Date
    updatedAt?: string | Date;
}

// 1. Fetch History
export const fetchHistory = async (userId: string, filters: any = {}): Promise<HistoryItem[]> => {
    const params = new URLSearchParams({ userId });

    if (filters.status) params.append('status', filters.status);
    if (filters.menuId) params.append('menuId', filters.menuId);
    if (filters.label) params.append('label', filters.label);
    if (filters.subMenuId) params.append('subMenuId', filters.subMenuId);

    const res = await fetch(`${API_BASE}/history?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch history');

    const data = await res.json();
    return data.map((item: any) => ({
        ...item,
        // Ensure id exists (use _id if id is missing)
        id: item.id || item._id,
        createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined
    }));
};

// 2. Add History
export const addHistoryItem = async (item: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to add item');
    return res.json();
};

// 3. Update History
export const updateHistoryItem = async (id: string, updates: any): Promise<void> => {
    const res = await fetch(`${API_BASE}/history/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update item');
};

// 4. Delete History
export const deleteHistoryItem = async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/history/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete item');
};

// 5. Toggle Status
export const toggleHistoryStatus = async (id: string, currentStatus: string): Promise<void> => {
    const statusFlow: Record<string, 'pending' | 'in-progress' | 'completed'> = {
        'pending': 'in-progress',
        'in-progress': 'completed',
        'completed': 'pending'
    };
    const nextStatus = statusFlow[currentStatus] || 'pending';
    await updateHistoryItem(id, { status: nextStatus });
};

// 6. Toggle Priority
export const toggleHistoryPriority = async (id: string, currentPriority: string = 'normal'): Promise<void> => {
    const nextPriority = currentPriority === 'normal' ? 'high' : 'normal';
    await updateHistoryItem(id, { priority: nextPriority });
};

// 7. Check Duplicate History (Simple client-side filtering for now)
export const checkDuplicateHistory = async (userId: string, content: string): Promise<HistoryItem[]> => {
    // Fetch recent items (optimization: API should support limit)
    // For now fetches all, but we can optimize API later.
    const allHistory = await fetchHistory(userId);

    // Check for exact content match or very similar (e.g. within last 24h?)
    // Logic from firebaseService was likely looking for identical content.
    // Let's return exact matches.
    return allHistory.filter(item => item.content === content || item.content.includes(content));
};

// --- Features & Settings (Optional for first pass, but good to have) ---
// 8. Add Comment
export const addComment = async (historyId: string, comment: string, userId: string): Promise<Comment> => {
    const res = await fetch(`${API_BASE}/history/${historyId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment, userId }),
    });
    if (!res.ok) throw new Error('Failed to add comment');
    return res.json();
};

// 9. Edit Comment
export const editComment = async (historyId: string, commentId: string, content: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/history/${historyId}/comments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, content }),
    });
    if (!res.ok) throw new Error('Failed to edit comment');
};

// 10. Delete Comment
export const deleteComment = async (historyId: string, commentId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/history/${historyId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete comment');
};

// --- Features & Settings (Optional for first pass, but good to have) ---
// We can implement these later or now. Let's stick to History first.

