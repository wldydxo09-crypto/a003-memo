// Firebase Service - CRUD Operations for History Items
import {
    collection,
    addDoc,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
    where,
    deleteDoc,
    doc,
    updateDoc,
    setDoc, // Added for user settings
    getDocs, // Added
    limit,   // Added
    Timestamp,
    QueryConstraint
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

// Types
export interface HistoryItem {
    id?: string;
    userId: string;
    menuId: string;
    menuName: string;
    content: string;
    summary?: string | null;
    images: string[];
    status: 'pending' | 'in-progress' | 'completed';
    labels: string[];
    sheetName?: string | null;
    emailSent?: boolean;
    triggerInfo?: string | null;
    calendarEventId?: string;
    priority?: 'normal' | 'high'; // Added priority
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export type LabelType = 'issue' | 'idea' | 'update' | 'general';

// Collection reference
const HISTORY_COLLECTION = 'history';

// Add new history item
export async function checkDuplicateHistory(userId: string, content: string): Promise<HistoryItem[]> {
    try {
        const q = query(
            collection(db, 'history'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(50) // Check last 50 items
        );
        const snapshot = await getDocs(q);
        const recentItems = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as HistoryItem));

        // Simple fuzzy check: Check if NEW content is contained in OLD, or OLD in NEW (to catch partial updates)
        // Or simple exact match of first 20 chars?
        // User asked for "entering same thing".
        // Let's normalize spaces.
        const normalizedNew = content.trim().replace(/\s+/g, ' ').toLowerCase();

        return recentItems.filter((item: HistoryItem) => {
            const normalizedOld = item.content.trim().replace(/\s+/g, ' ').toLowerCase();
            // Check for exact match or significant overlap (if length > 20)
            if (normalizedNew === normalizedOld) return true;
            if (normalizedNew.length > 20 && normalizedOld.includes(normalizedNew)) return true;
            if (normalizedOld.length > 20 && normalizedNew.includes(normalizedOld)) return true;
            return false;
        });
    } catch (error) {
        console.error("Error checking duplicates:", error);
        return [];
    }
}

// Add new history item
export async function addHistoryItem(
    item: Omit<HistoryItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = Timestamp.now();

    // Remote undefined values as Firestore doesn't support them
    const cleanItem = Object.entries(item).reduce((acc, [key, value]) => {
        if (value !== undefined) {
            acc[key] = value;
        }
        return acc;
    }, {} as any);

    const docRef = await addDoc(collection(db, HISTORY_COLLECTION), {
        ...cleanItem,
        createdAt: now,
        updatedAt: now,
    });
    return docRef.id;
}

// Update history item
export async function updateHistoryItem(
    id: string,
    updates: Partial<HistoryItem>
): Promise<void> {
    const docRef = doc(db, HISTORY_COLLECTION, id);
    await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
    });
}

// Toggle status (Cycle: pending -> in-progress -> completed -> pending)
export async function toggleHistoryStatus(id: string, currentStatus: string): Promise<void> {
    let newStatus: 'pending' | 'in-progress' | 'completed';

    if (currentStatus === 'pending') {
        newStatus = 'in-progress';
    } else if (currentStatus === 'in-progress') {
        newStatus = 'completed';
    } else {
        newStatus = 'pending'; // Reset from completed/other to pending
    }

    await updateHistoryItem(id, { status: newStatus });
}

// Toggle priority (normal <-> high)
export async function toggleHistoryPriority(id: string, currentPriority?: 'normal' | 'high'): Promise<void> {
    const newPriority = currentPriority === 'high' ? 'normal' : 'high';
    await updateHistoryItem(id, { priority: newPriority });
}

// Delete history item
export async function deleteHistoryItem(id: string): Promise<void> {
    const docRef = doc(db, HISTORY_COLLECTION, id);
    await deleteDoc(docRef);
}

// Subscribe to history items (real-time)
export function subscribeToHistory(
    userId: string,
    filters: {
        status?: 'pending' | 'in-progress' | 'completed' | 'all';
        menuId?: string;
        label?: string;
    },
    callback: (items: HistoryItem[]) => void
): () => void {
    const constraints: QueryConstraint[] = [
        where('userId', '==', userId)
    ];

    // Only add orderBy if NOT filtering by label (to avoid composite index requirement)
    // The frontend HistoryList sorts items anyway.
    if (!filters.label) {
        constraints.push(orderBy('createdAt', 'desc'));
    }

    if (filters.status && filters.status !== 'all') {
        constraints.push(where('status', '==', filters.status));
    }

    if (filters.menuId) {
        constraints.push(where('menuId', '==', filters.menuId));
    }

    if (filters.label) {
        constraints.push(where('labels', 'array-contains', filters.label));
    }

    const q = query(collection(db, HISTORY_COLLECTION), ...constraints);

    return onSnapshot(q, (snapshot) => {
        const items: HistoryItem[] = [];
        snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() } as HistoryItem);
        });
        callback(items);
    }, (error) => {
        console.error("Error subscribing history:", error);
        callback([]); // Create empty list on error to stop loading
    });
}

// Upload image to Firebase Storage
export async function uploadImage(
    userId: string,
    file: File
): Promise<string> {
    const timestamp = Date.now();
    const filename = `${userId}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, `images/${filename}`);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
}

// Upload multiple images
export async function uploadImages(
    userId: string,
    files: File[]
): Promise<string[]> {
    const uploadPromises = files.map(file => uploadImage(userId, file));
    return Promise.all(uploadPromises);
}

// --- Feature Inventory System ---

export interface FeatureItem {
    id?: string;
    userId: string;
    name: string;
    description: string;
    status: 'planned' | 'in-progress' | 'completed' | 'maintenance' | 'deprecated';
    progress: number;
    type: 'frontend' | 'backend' | 'database' | 'external' | 'other';
    priority: 'low' | 'medium' | 'high' | 'critical';
    techStack: string[];
    relatedDocumentIds?: string[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

const FEATURES_COLLECTION = 'features';

export async function addFeature(
    item: Omit<FeatureItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, FEATURES_COLLECTION), {
        ...item,
        createdAt: now,
        updatedAt: now,
    });
    return docRef.id;
}

export async function updateFeature(
    id: string,
    updates: Partial<FeatureItem>
): Promise<void> {
    const docRef = doc(db, FEATURES_COLLECTION, id);
    await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
    });
}

export async function deleteFeature(id: string): Promise<void> {
    const docRef = doc(db, FEATURES_COLLECTION, id);
    await deleteDoc(docRef);
}

export function subscribeToFeatures(
    userId: string,
    callback: (items: FeatureItem[]) => void
): () => void {
    const q = query(
        collection(db, FEATURES_COLLECTION),
        where('userId', '==', userId)
        // orderBy('createdAt', 'desc') // Removed to avoid index requirement
    );

    return onSnapshot(q, (snapshot) => {
        const items: FeatureItem[] = [];
        snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() } as FeatureItem);
        });

        // Sort in memory instead
        items.sort((a, b) => {
            const tA = a.createdAt?.seconds || 0;
            const tB = b.createdAt?.seconds || 0;
            return tB - tA;
        });

        callback(items);
    });
}

// --- User Settings (Submenus) ---

const SETTINGS_COLLECTION = 'user_settings';

export async function saveUserSettings(
    userId: string,
    subMenus: Record<string, string[]>
): Promise<void> {
    const docRef = doc(db, SETTINGS_COLLECTION, userId);
    await setDoc(docRef, {
        subMenus,
        updatedAt: serverTimestamp()
    }, { merge: true });
}

export function subscribeToUserSettings(
    userId: string,
    callback: (subMenus: Record<string, string[]>) => void
): () => void {
    const docRef = doc(db, SETTINGS_COLLECTION, userId);
    return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data().subMenus || {});
        } else {
            callback({});
        }
    });
}
