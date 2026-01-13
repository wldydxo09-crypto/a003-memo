'use client';

import { useState, useEffect } from 'react';
import { fetchHistory, toggleHistoryStatus, updateHistoryItem, deleteHistoryItem, HistoryItem, toggleHistoryPriority, addComment, editComment, deleteComment } from '@/lib/dataService';
import styles from './HistoryList.module.css';

interface HistoryListProps {
    userId: string;
    menuId?: string;
    subMenuId?: string; // For filtering by submenu keyword
    initialFilter?: FilterType;
    initialSearchQuery?: { query: string; timestamp: number };
    initialLabel?: string | null;
}

type FilterType = 'all' | 'pending' | 'in-progress' | 'completed';
type LabelFilter = string | null;

// Helper to highlight text
const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) {
        return <>{text}</>;
    }
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <span key={i} style={{ backgroundColor: 'yellow', color: 'black' }}>{part}</span>
                ) : (
                    part
                )
            )}
        </>
    );
};

export default function HistoryList({ userId, menuId, subMenuId, initialFilter = 'all', initialSearchQuery, initialLabel = null }: HistoryListProps) {
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [filter, setFilter] = useState<FilterType>(initialFilter);
    const [labelFilter, setLabelFilter] = useState<LabelFilter>(initialLabel);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(initialSearchQuery?.query || '');

    useEffect(() => {
        if (initialFilter) setFilter(initialFilter);
    }, [initialFilter]);

    useEffect(() => {
        setLabelFilter(initialLabel);
    }, [initialLabel]);

    useEffect(() => {
        if (initialSearchQuery) setSearchTerm(initialSearchQuery.query);
    }, [initialSearchQuery]); // Relies on object identity change (timestamp)



    const [hideCompleted, setHideCompleted] = useState(false); // Hide completed in 'All' view
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // Sort Order
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    // Comment States
    const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
    const [newComment, setNewComment] = useState<Record<string, string>>({});
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentContent, setEditingCommentContent] = useState('');

    useEffect(() => {
        const loadItems = async () => {
            setLoading(true);
            try {
                // Fetch ALL items for this context (ignore status filter in API) to calculate counts
                const fetchedItems = await fetchHistory(userId, {
                    // status: filter === 'all' ? undefined : filter, // Removed to fetch all
                    menuId: menuId,
                    label: labelFilter || undefined,
                    subMenuId: subMenuId,
                });
                setItems(fetchedItems);
            } catch (error) {
                console.error("Failed to load history:", error);
            } finally {
                setLoading(false);
            }
        };

        loadItems();
    }, [userId, menuId, subMenuId, labelFilter]); // Removed 'filter' dependency to avoid refetching on tab switch

    const handleStatusChange = async (item: HistoryItem, newStatus: 'pending' | 'in-progress' | 'completed') => {
        if (!item.id || item.status === newStatus) return;

        const updates: any = { status: newStatus };
        if (newStatus === 'completed') {
            updates.completedAt = new Date();
        }

        // Optimistic Update: Update status in place (don't remove from list, let client filter handle it)
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updates } : i));

        try {
            await updateHistoryItem(item.id, updates);
        } catch (error) {
            console.error('Status update error:', error);
            alert('상태 변경에 실패했습니다.');
            // Revert state logic could go here
        }
    };

    // ... (handlePriorityToggle, handleDelete, etc. remain same) ...

    const handlePriorityToggle = async (item: HistoryItem) => {
        if (!item.id) return;

        // Optimistic Update
        const newPriority = item.priority === 'high' ? 'normal' : 'high';
        setItems(prev => prev.map(i =>
            i.id === item.id ? { ...i, priority: newPriority } : i
        ));

        try {
            await toggleHistoryPriority(item.id, item.priority);
        } catch (error) {
            console.error("Error toggling priority:", error);
            // Revert
            setItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, priority: item.priority } : i
            ));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까? 복구할 수 없습니다.')) return;

        // Optimistic Update: Remove immediately from UI
        setItems(prev => prev.filter(item => item.id !== id));

        try {
            await deleteHistoryItem(id);
        } catch (error) {
            console.error('Delete error:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    const startEditing = (item: HistoryItem) => {
        setEditingId(item.id || null);
        setEditContent(item.content);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditContent('');
    };

    const saveEditing = async (id: string) => {
        if (!editContent.trim()) return;
        try {
            await updateHistoryItem(id, { content: editContent });
            setEditingId(null);
            setEditContent('');
        } catch (error) {
            console.error('Update error:', error);
            alert('수정에 실패했습니다.');
        }
    };

    const handleAddComment = async (historyId: string, comment: string) => {
        if (!comment.trim()) return;

        // Optimistic Update
        const tempId = crypto.randomUUID();
        const tempComment = {
            id: tempId,
            content: comment,
            createdAt: new Date().toISOString(),
            userId: userId
        };

        setItems(prev => prev.map(item => {
            if (item.id === historyId) {
                return {
                    ...item,
                    comments: [...(item.comments || []), tempComment]
                };
            }
            return item;
        }));

        // Clear input immediately
        setNewComment(prev => ({ ...prev, [historyId]: '' }));

        try {
            const addedComment = await addComment(historyId, comment, userId);
            // Update with real ID from server
            setItems(prev => prev.map(item => {
                if (item.id === historyId) {
                    return {
                        ...item,
                        comments: item.comments?.map(c => c.id === tempId ? addedComment : c)
                    };
                }
                return item;
            }));
        } catch (error) {
            console.error('Failed to add comment:', error);
            alert('댓글 등록에 실패했습니다.');
            // Revert on failure
            setItems(prev => prev.map(item => {
                if (item.id === historyId) {
                    return {
                        ...item,
                        comments: item.comments?.filter(c => c.id !== tempId)
                    };
                }
                return item;
            }));
        }
    };

    const handleEditComment = async (historyId: string, commentId: string) => {
        if (!editingCommentContent.trim()) return;

        // Optimistic update
        setItems(prev => prev.map(item => {
            if (item.id === historyId) {
                return {
                    ...item,
                    comments: item.comments?.map(c =>
                        c.id === commentId ? { ...c, content: editingCommentContent } : c
                    )
                };
            }
            return item;
        }));

        setEditingCommentId(null);
        setEditingCommentContent('');

        try {
            await editComment(historyId, commentId, editingCommentContent);
        } catch (error) {
            console.error('Failed to edit comment:', error);
            alert('댓글 수정에 실패했습니다.');
        }
    };

    const handleDeleteComment = async (historyId: string, commentId: string) => {
        if (!confirm('댓글을 삭제하시겠습니까?')) return;

        // Optimistic update
        setItems(prev => prev.map(item => {
            if (item.id === historyId) {
                return {
                    ...item,
                    comments: item.comments?.filter(c => c.id !== commentId)
                };
            }
            return item;
        }));

        try {
            await deleteComment(historyId, commentId);
        } catch (error) {
            console.error('Failed to delete comment:', error);
            alert('댓글 삭제에 실패했습니다.');
        }
    };

    const formatDate = (timestamp: any, fallbackId?: string) => {
        let date: Date | null = null;

        try {
            // 1. Try generic timestamp
            if (timestamp) {
                if (timestamp instanceof Date) {
                    date = timestamp;
                } else if (typeof timestamp === 'object' && (timestamp.seconds !== undefined || timestamp._seconds !== undefined)) {
                    const seconds = timestamp.seconds ?? timestamp._seconds;
                    date = new Date(Number(seconds) * 1000);
                } else {
                    date = new Date(timestamp);
                }
            }

            // 2. Validate extracted date
            if (date && isNaN(date.getTime())) {
                date = null;
            }

            // 3. Fallback to ObjectId if date is invalid/missing
            if (!date && fallbackId && /^[0-9a-fA-F]{24}$/.test(fallbackId)) {
                const timestampHex = fallbackId.substring(0, 8);
                const seconds = parseInt(timestampHex, 16);
                date = new Date(seconds * 1000);
            }

            if (!date || isNaN(date.getTime())) return extractedDateDisplay(fallbackId);

            return date.toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            console.error("Date formatting failed", e);
            return '';
        }
    };

    const extractedDateDisplay = (id?: string) => {
        // Last resort for non-ObjectId strings to avoid completely blank lines if desired, or just ''
        return '';
    };

    // Helper: Check for "Long Pending" (e.g., > 3 days and not completed)
    const isLongPending = (item: HistoryItem) => {
        if (item.status === 'completed') return false;
        if (!item.createdAt) return false;

        try {
            const date = new Date(item.createdAt);
            const diffTime = Date.now() - date.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            return diffDays >= 3;
        } catch (e) {
            return false;
        }
    };

    const longPendingCount = items.filter(isLongPending).length;

    const getLabelColor = (label: string) => {
        const colors: Record<string, string> = {
            issue: 'danger',
            idea: 'primary',
            update: 'success',
            general: 'warning',
        };
        return colors[label] || 'primary';
    };

    const getLabelName = (label: string) => {
        const names: Record<string, string> = {
            issue: '문제',
            idea: '아이디어',
            update: '업데이트',
            general: '일반',
        };
        return names[label] || label;
    };

    const labelOptions = [
        { id: 'issue', name: '문제' },
        { id: 'idea', name: '아이디어' },
        { id: 'update', name: '업데이트' },
        { id: 'general', name: '일반' },
    ];

    // Stats Calculation
    const counts = {
        all: items.length,
        pending: items.filter(i => i.status === 'pending').length,
        inProgress: items.filter(i => i.status === 'in-progress').length,
        completed: items.filter(i => i.status === 'completed').length,
    };

    // Filter Logic
    const filteredItems = items.filter(item => {
        // Status Filter (Client-side)
        if (filter !== 'all' && item.status !== filter) return false;

        // Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchesContent = item.content.toLowerCase().includes(term);
            const matchesSummary = item.summary && item.summary.toLowerCase().includes(term);
            const matchesComments = item.comments && item.comments.some(c => c.content.toLowerCase().includes(term));

            if (!matchesContent && !matchesSummary && !matchesComments) return false;
        }

        // Hide Completed Filter (Only active when filter is 'all')
        if (filter === 'all' && hideCompleted && item.status === 'completed') {
            return false;
        }

        return true;
    }).sort((a, b) => {
        const getDate = (d: any) => {
            if (!d) return new Date(0);
            return new Date(d);
        };

        let dateA, dateB;

        if (filter === 'completed') {
            dateA = getDate(a.completedAt || a.updatedAt || a.createdAt);
            dateB = getDate(b.completedAt || b.updatedAt || b.createdAt);
        } else {
            dateA = getDate(a.createdAt);
            dateB = getDate(b.createdAt);
        }

        return sortOrder === 'desc'
            ? dateB.getTime() - dateA.getTime()
            : dateA.getTime() - dateB.getTime();
    });

    return (
        <div className={styles.container}>
            {/* Alert for Long Pending */}
            {longPendingCount > 0 && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#fca5a5',
                    padding: '10px 15px',
                    borderRadius: '12px',
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.9rem'
                }}>
                    <span>⚠️</span>
                    <span>
                        <strong>{longPendingCount}건</strong>의 기록이 3일 이상 미처리 상태입니다. 확인이 필요합니다.
                    </span>
                    <button
                        onClick={() => { setFilter('pending'); setSortOrder('asc'); }}
                        style={{
                            marginLeft: 'auto',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                        }}
                    >
                        바로보기
                    </button>
                </div>
            )}

            {/* Search */}
            <div className={styles.searchContainer}>
                <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="단어 검색... (내용, 요약)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Filters - Column Layout with consistent spacing */}
            <div className={styles.filters} style={{ flexDirection: 'column', gap: '5px', marginBottom: '5px' }}>
                {/* Row 1: Status Filters + Sort */}
                <div className={styles.statusFilters}>
                    <button
                        className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        전체 ({counts.all})
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`}
                        onClick={() => setFilter('pending')}
                    >
                        미완료 ({counts.pending})
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`}
                        onClick={() => setFilter('completed')}
                    >
                        완료 ({counts.completed})
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === 'in-progress' ? styles.active : ''}`}
                        onClick={() => setFilter('in-progress')}
                    >
                        진행중 ({counts.inProgress})
                    </button>

                    {/* Sort Toggle Button */}
                    <button
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className={styles.filterBtn}
                        style={{ marginLeft: '10px', border: '1px solid var(--border-color)', background: 'transparent' }}
                    >
                        {sortOrder === 'desc' ? '⬇️ 최신순' : '⬆️ 과거순'}
                    </button>
                </div>

                {/* Row 2: Checkbox + Label Filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {filter === 'all' && (
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}>
                            <input
                                type="checkbox"
                                checked={hideCompleted}
                                onChange={(e) => setHideCompleted(e.target.checked)}
                            />
                            완료 숨기기
                        </label>
                    )}
                    <div className={styles.labelFilters}>
                        {labelOptions.map((label) => (
                            <button
                                key={label.id}
                                className={`${styles.labelFilterBtn} ${styles[getLabelColor(label.id)]} ${labelFilter === label.id ? styles.active : ''
                                    }`}
                                onClick={() => setLabelFilter(labelFilter === label.id ? null : label.id)}
                            >
                                {label.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <span>불러오는 중...</span>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className={styles.empty}>
                    <span className={styles.emptyIcon}>📭</span>
                    <p>{searchTerm ? '검색 결과가 없습니다.' : '아직 기록이 없습니다.'}</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {filteredItems.map((item) => (
                        <div
                            key={item.id}
                            className={`${styles.card} ${item.status === 'completed' ? styles.completed : ''} ${item.status === 'in-progress' ? styles.inProgress : ''}`}
                            style={item.priority === 'high' ? { border: '1px solid #ff4444', boxShadow: '0 0 10px rgba(239, 68, 68, 0.2)' } : {}}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.cardMeta}>
                                    <span className={styles.menuBadge}>
                                        {item.menuName}
                                    </span>
                                    {item.subMenuId && (
                                        <span style={{ fontSize: '0.75rem', background: '#6366f1', color: 'white', padding: '2px 8px', borderRadius: '10px' }}>
                                            ➜ {item.subMenuId}
                                        </span>
                                    )}
                                    {item.priority === 'high' && (
                                        <span style={{ fontSize: '0.8rem', color: '#ff4444', fontWeight: 'bold' }}>🔥 긴급</span>
                                    )}

                                    {/* Only show Created Date (User Request) */}
                                    <span className={styles.date}>{formatDate(item.createdAt, item._id)}</span>

                                    {/* Show Completed Date (Fallback to updatedAt for legacy items) */}
                                    {item.status === 'completed' && (
                                        <span className={styles.date} style={{ color: '#4db6ac', marginLeft: '5px' }}>
                                            ✅ {formatDate(item.completedAt || item.updatedAt)}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.actionGroup}>
                                    {/* Priority Toggle Button */}
                                    <button
                                        className={styles.actionBtn}
                                        onClick={() => handlePriorityToggle(item)}
                                        title={item.priority === 'high' ? "중요 해제" : "중요 표시"}
                                        style={{
                                            color: item.priority === 'high' ? '#ff4444' : '#ccc',
                                            opacity: item.priority === 'high' ? 1 : 0.5
                                        }}
                                    >
                                        🔥
                                    </button>

                                    {/* Edit Button */}
                                    <button
                                        className={`${styles.actionBtn} ${styles.editBtn}`}
                                        onClick={() => startEditing(item)}
                                        title="수정"
                                    >
                                        ✏️
                                    </button>
                                    {/* Delete Button */}
                                    <button
                                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                        onClick={() => item.id && handleDelete(item.id)}
                                        title="삭제"
                                    >
                                        🗑️
                                    </button>
                                    {/* Check Button */}
                                    {/* Status Select */}
                                    <select
                                        className={styles.statusSelect}
                                        value={item.status}
                                        onChange={(e) => handleStatusChange(item, e.target.value as any)}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: item.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' :
                                                item.status === 'in-progress' ? 'rgba(59, 130, 246, 0.2)' :
                                                    'rgba(255, 255, 255, 0.1)',
                                            color: item.status === 'completed' ? '#34d399' :
                                                item.status === 'in-progress' ? '#60a5fa' :
                                                    '#9ca3af',
                                            cursor: 'pointer',
                                            outline: 'none',
                                            fontWeight: '500',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        <option value="pending" style={{ color: 'black' }}>미완료</option>
                                        <option value="in-progress" style={{ color: 'black' }}>진행중</option>
                                        <option value="completed" style={{ color: 'black' }}>완료</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.cardContent}>
                                {editingId === item.id ? (
                                    // Edit Mode
                                    <div>
                                        <textarea
                                            className={styles.editArea}
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                        />
                                        <div className={styles.editActions}>
                                            <button className={styles.cancelBtn} onClick={cancelEditing}>취소</button>
                                            <button className={styles.saveBtn} onClick={() => item.id && saveEditing(item.id)}>저장</button>
                                        </div>
                                    </div>
                                ) : (
                                    // View Mode
                                    item.summary ? (
                                        <>
                                            <p className={styles.summary}>
                                                <HighlightText text={item.summary} highlight={searchTerm} />
                                            </p>
                                            <details
                                                className={styles.details}
                                                open={searchTerm && item.content.toLowerCase().includes(searchTerm.toLowerCase()) ? true : undefined}
                                            >
                                                <summary>원본 내용 보기 {searchTerm && item.content.toLowerCase().includes(searchTerm.toLowerCase()) && !item.summary.toLowerCase().includes(searchTerm.toLowerCase()) && <span style={{ color: 'red', fontSize: '0.8em' }}>(검색어 포함)</span>}</summary>
                                                <p className={styles.originalContent}>
                                                    <HighlightText text={item.content} highlight={searchTerm} />
                                                </p>
                                            </details>
                                        </>
                                    ) : (
                                        <p className={styles.content}>
                                            <HighlightText text={item.content} highlight={searchTerm} />
                                        </p>
                                    )
                                )}
                            </div>

                            {/* Labels */}
                            {item.labels && item.labels.length > 0 && (
                                <div className={styles.cardLabels}>
                                    {item.labels.map((label) => (
                                        <span key={label} className={`${styles.label} ${styles[getLabelColor(label)]}`}>
                                            {getLabelName(label)}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Images */}
                            {item.images && item.images.length > 0 && (
                                <div className={styles.cardImages}>
                                    {item.images.map((url, index) => (
                                        <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                                            <img src={url} alt={`Image ${index + 1}`} />
                                        </a>
                                    ))}
                                </div>
                            )}

                            {/* Comments Section */}
                            <div className={styles.commentsSection}>
                                {/* Always show comments (User Request) */}
                                <div
                                    className={styles.commentToggleBtn}
                                    style={{ cursor: 'default', background: 'transparent', paddingLeft: 0 }}
                                >
                                    💬 댓글 {item.comments?.length || 0}
                                    {searchTerm && item.comments?.some(c => c.content.toLowerCase().includes(searchTerm.toLowerCase())) && <span style={{ fontSize: '0.8em', color: '#ff4444' }}> (검색됨)</span>}
                                </div>

                                <div className={styles.commentsContainer} onClick={(e) => e.stopPropagation()}>
                                    {/* Comment List */}
                                    <div className={styles.commentList}>
                                        {item.comments && item.comments.length > 0 ? (
                                            item.comments.map(comment => (
                                                <div key={comment.id} className={styles.commentItem}
                                                    style={searchTerm && comment.content.toLowerCase().includes(searchTerm.toLowerCase()) ? { backgroundColor: 'rgba(255, 255, 0, 0.1)' } : {}}
                                                >
                                                    <div className={styles.commentHeader}>
                                                        <span className={styles.commentDate}>{formatDate(comment.createdAt)}</span>
                                                        <div className={styles.commentActions}>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingCommentId(comment.id);
                                                                    setEditingCommentContent(comment.content);
                                                                }}
                                                                title="수정"
                                                            >✏️</button>
                                                            <button
                                                                onClick={() => handleDeleteComment(item.id!, comment.id)}
                                                                title="삭제"
                                                            >🗑️</button>
                                                        </div>
                                                    </div>
                                                    {editingCommentId !== comment.id && (
                                                        <div className={styles.commentBody}>
                                                            <HighlightText text={comment.content} highlight={searchTerm} />
                                                        </div>
                                                    )}
                                                    {editingCommentId === comment.id ? (
                                                        <div className={styles.commentEditBox}>
                                                            <input
                                                                type="text"
                                                                value={editingCommentContent}
                                                                onChange={(e) => setEditingCommentContent(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handleEditComment(item.id!, comment.id);
                                                                    } else if (e.key === 'Escape') {
                                                                        setEditingCommentId(null);
                                                                    }
                                                                }}
                                                                autoFocus
                                                            />
                                                            <button onClick={() => handleEditComment(item.id!, comment.id)}>저장</button>
                                                            <button onClick={() => setEditingCommentId(null)}>취소</button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ))
                                        ) : (
                                            <div className={styles.noComments}>댓글이 없습니다.</div>
                                        )}
                                    </div>

                                    {/* Add Comment Input */}
                                    <div className={styles.commentInputBox}>
                                        <input
                                            type="text"
                                            placeholder="댓글을 입력하세요..."
                                            value={newComment[item.id!] || ''}
                                            onChange={(e) => setNewComment(prev => ({ ...prev, [item.id!]: e.target.value }))}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleAddComment(item.id!, newComment[item.id!] || '');
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => handleAddComment(item.id!, newComment[item.id!] || '')}
                                            disabled={!newComment[item.id!]?.trim()}
                                        >
                                            등록
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Extra Info */}
                            {(item.sheetName || item.triggerInfo || item.emailSent) && (
                                <div className={styles.cardFooter}>
                                    {item.sheetName && (
                                        <span className={styles.footerItem}>📄 {item.sheetName}</span>
                                    )}
                                    {item.triggerInfo && (
                                        <span className={styles.footerItem}>📅 {item.triggerInfo}</span>
                                    )}
                                    {item.emailSent && (
                                        <span className={styles.footerItem}>✉️ 메일 발송</span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
