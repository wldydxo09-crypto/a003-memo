'use client';

import { useState, useEffect } from 'react';
import { subscribeToHistory, toggleHistoryStatus, updateHistoryItem, deleteHistoryItem, HistoryItem, toggleHistoryPriority } from '@/lib/firebaseService';
import styles from './HistoryList.module.css';

interface HistoryListProps {
    userId: string;
    menuId?: string;
    subMenuId?: string; // For filtering by submenu keyword
    initialFilter?: FilterType;
    initialSearchQuery?: string;
    initialLabel?: string | null;
}

type FilterType = 'all' | 'pending' | 'in-progress' | 'completed';
type LabelFilter = string | null;

export default function HistoryList({ userId, menuId, subMenuId, initialFilter = 'all', initialSearchQuery = '', initialLabel = null }: HistoryListProps) {
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [filter, setFilter] = useState<FilterType>(initialFilter);
    const [labelFilter, setLabelFilter] = useState<LabelFilter>(initialLabel);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (initialFilter) setFilter(initialFilter);
    }, [initialFilter]);

    useEffect(() => {
        setLabelFilter(initialLabel);
    }, [initialLabel]);

    useEffect(() => {
        if (initialSearchQuery !== undefined) setSearchTerm(initialSearchQuery);
    }, [initialSearchQuery]);

    // New States
    const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
    const [hideCompleted, setHideCompleted] = useState(false); // Hide completed in 'All' view
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // Sort Order
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        setLoading(true);

        const unsubscribe = subscribeToHistory(
            userId,
            {
                status: filter === 'all' ? undefined : filter,
                menuId: menuId,
                label: labelFilter || undefined,
                // subMenuId filtering is done client-side
            },
            (fetchedItems) => {
                // If subMenuId is specified but not in query, filter client-side
                if (subMenuId) {
                    const filtered = fetchedItems.filter(item => item.subMenuId === subMenuId);
                    setItems(filtered);
                } else {
                    setItems(fetchedItems);
                }
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, menuId, subMenuId, filter, labelFilter]);

    const handleStatusChange = async (item: HistoryItem, newStatus: 'pending' | 'in-progress' | 'completed') => {
        if (!item.id || item.status === newStatus) return;

        // Optimistic Update
        setItems(prev => {
            // If we are filtering by status, and the new status doesn't match, remove it
            if (filter !== 'all' && filter !== newStatus) {
                return prev.filter(i => i.id !== item.id);
            }
            // Otherwise just update the status
            return prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i);
        });

        try {
            await updateHistoryItem(item.id, { status: newStatus });
        } catch (error) {
            console.error('Status update error:', error);
            alert('상태 변경에 실패했습니다.');
            // Revert state logic could go here, but omitted for brevity
        }
    };

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
            // Ideally, revert state here if needed, but fetch will likely restore it on next snapshot if failed
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

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Helper: Check for "Long Pending" (e.g., > 3 days and not completed)
    const isLongPending = (item: HistoryItem) => {
        if (item.status === 'completed') return false;
        if (!item.createdAt) return false;

        try {
            let date: Date;
            // Safe Date Parsing
            if ((item.createdAt as any)?.toDate) {
                date = (item.createdAt as any).toDate();
            } else {
                date = new Date(item.createdAt as any);
            }

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

    // Filter Logic
    const filteredItems = items.filter(item => {
        // Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchesSearch = item.content.toLowerCase().includes(term) ||
                (item.summary && item.summary.toLowerCase().includes(term));
            if (!matchesSearch) return false;
        }

        // Hide Completed Filter (Only active when filter is 'all')
        if (filter === 'all' && hideCompleted && item.status === 'completed') {
            return false;
        }

        return true;
    }).sort((a, b) => {
        const getDate = (d: any) => {
            if (!d) return new Date(0);
            return d.toDate ? d.toDate() : new Date(d);
        };

        const dateA = getDate(a.createdAt);
        const dateB = getDate(b.createdAt);

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

            {/* Filters */}
            <div className={styles.filters}>
                <div className={styles.statusFilters}>
                    <button
                        className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        전체
                    </button>
                    {filter === 'all' && (
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            marginLeft: '8px',
                            cursor: 'pointer'
                        }}>
                            <input
                                type="checkbox"
                                checked={hideCompleted}
                                onChange={(e) => setHideCompleted(e.target.checked)}
                            />
                            완료 숨기기
                        </label>
                    )}
                    <button
                        className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`}
                        onClick={() => setFilter('pending')}
                    >
                        미완료
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`}
                        onClick={() => setFilter('completed')}
                    >
                        완료
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === 'in-progress' ? styles.active : ''}`}
                        onClick={() => setFilter('in-progress')}
                    >
                        진행중
                    </button>

                    {/* Sort Toggle Button - Styled like filters but distinct */}
                    <button
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className={styles.filterBtn}
                        style={{ marginLeft: '10px', border: '1px solid var(--border-color)', background: 'transparent' }}
                    >
                        {sortOrder === 'desc' ? '⬇️ 최신순' : '⬆️ 과거순'}
                    </button>
                </div>

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
                                    <span className={styles.date}>{formatDate(item.createdAt)}</span>
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
                                            <p className={styles.summary}>{item.summary}</p>
                                            <details className={styles.details}>
                                                <summary>원본 내용 보기</summary>
                                                <p className={styles.originalContent}>{item.content}</p>
                                            </details>
                                        </>
                                    ) : (
                                        <p className={styles.content}>{item.content}</p>
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

                            {/* Extra Info */}
                            {(item.sheetName || item.triggerInfo) && (
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
