'use client';

import { useState, useEffect } from 'react';
import { subscribeToHistory, HistoryItem } from '@/lib/firebaseService';
import { useRouter } from 'next/navigation';
import styles from './Dashboard.module.css';

interface DashboardProps {
    userId: string;
    onOpenWrite: (menuId: string) => void;
    onNavigateToHistory: (filter: 'all' | 'pending' | 'in-progress' | 'completed', searchQuery?: string) => void;
}



import CalendarWidget, { CalendarEvent } from './CalendarWidget';
import NewsWidget from './NewsWidget';
import SettingsModal from './SettingsModal';

export default function Dashboard({ userId, onOpenWrite, onNavigateToHistory }: DashboardProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            onNavigateToHistory('all', searchQuery.trim());
        }
    };

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0
    });

    // Calendar
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [calendarTab, setCalendarTab] = useState<'today' | 'week' | 'month'>('month'); // Default to month for better widget view
    const [loadingCalendar, setLoadingCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [hidePastEvents, setHidePastEvents] = useState(true); // Default to true (Hide by default)

    // Filtered History
    useEffect(() => {
        // Subscribe to ALL history
        const unsubscribe = subscribeToHistory(userId, { status: 'all' }, (items) => {
            const counts = {
                total: items.length,
                pending: items.filter(i => i.status === 'pending').length,
                inProgress: items.filter(i => i.status === 'in-progress').length,
                completed: items.filter(i => i.status === 'completed').length
            };
            setStats(counts);
        });
        return () => unsubscribe();
    }, [userId]);

    // Fetch Calendar
    const fetchEvents = async () => {
        setLoadingCalendar(true);
        try {
            const now = new Date();
            // Start of events range
            // If month view, we need full month. 
            // Actually API takes timeMin/timeMax.

            let timeMin = new Date().toISOString();
            let timeMax = undefined;

            if (calendarTab === 'today') {
                const start = new Date(now.setHours(0, 0, 0, 0));
                timeMin = start.toISOString();
                const end = new Date(now);
                end.setDate(end.getDate() + 1);
                timeMax = end.toISOString();
            } else if (calendarTab === 'week') {
                const start = new Date(now.setHours(0, 0, 0, 0));
                timeMin = start.toISOString();
                const end = new Date(now);
                end.setDate(end.getDate() + 7);
                timeMax = end.toISOString();
            } else if (calendarTab === 'month') {
                const start = new Date(now.setDate(1)); // 1st of month
                start.setHours(0, 0, 0, 0);
                timeMin = start.toISOString();
                const end = new Date(now);
                end.setMonth(end.getMonth() + 1);
                end.setDate(0); // Last day
                timeMax = end.toISOString();
            }

            const res = await fetch(`/api/calendar?timeMin=${timeMin}${timeMax ? `&timeMax=${timeMax}` : ''}`);
            const data = await res.json();

            if (data.success) {
                setEvents(data.events);
            }
        } catch (error) {
            console.error("Failed to fetch calendar", error);
        } finally {
            setLoadingCalendar(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [calendarTab]);

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm('정말로 이 일정을 삭제하시겠습니까? (구글 캘린더에서도 삭제됩니다)')) return;
        try {
            const res = await fetch(`/api/calendar?eventId=${eventId}`, { method: 'DELETE' });
            if (res.ok) {
                setEvents(prev => prev.filter(e => e.id !== eventId));
                alert('일정이 삭제되었습니다.'); // Added success alert
            } else {
                alert('삭제 실패');
            }
        } catch (e) {
            console.error(e);
            alert('삭제 오류');
        }
    };

    const isPastEvent = (event: CalendarEvent) => {
        const endData = event.end.dateTime || event.end.date;
        if (!endData) return false;
        return new Date(endData) < new Date();
    };

    const formatEventTime = (event: CalendarEvent) => {
        if (event.start.dateTime) {
            const date = new Date(event.start.dateTime);
            return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        }
        return '하루 종일';
    };

    const formatEventDate = (event: CalendarEvent) => {
        if (event.start.dateTime) {
            const date = new Date(event.start.dateTime);
            return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
        }
        return event.start.date || '';
    };


    // Filter events
    const displayedEvents = events
        .filter(event => {
            // 1. Check Past Event Filter
            if (hidePastEvents && isPastEvent(event)) return false;

            // 2. Check Date Selection
            if (selectedDate) {
                const eDate = new Date(event.start.dateTime || event.start.date || '');
                return eDate.getDate() === selectedDate.getDate() &&
                    eDate.getMonth() === selectedDate.getMonth() &&
                    eDate.getFullYear() === selectedDate.getFullYear();
            }

            // 3. Check Tab Filter (only if no specific date selected)
            const eDate = new Date(event.start.dateTime || event.start.date || '');
            const today = new Date();

            if (calendarTab === 'today') {
                return eDate.getDate() === today.getDate() &&
                    eDate.getMonth() === today.getMonth() &&
                    eDate.getFullYear() === today.getFullYear();
            }
            if (calendarTab === 'week') {
                // Simplified week check (next 7 days)
                const diffTime = eDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 7;
            }
            if (calendarTab === 'month') {
                // Current viewing month (based on selectedDate if exists, or current real month? 
                // Wait, CalendarWidget has 'currentDate' internal state, but Dashboard doesn't know it.
                // Usually 'month' tab means 'This current month'.
                return eDate.getMonth() === today.getMonth() &&
                    eDate.getFullYear() === today.getFullYear();
            }
            return true;
        })
        .sort((a, b) => {
            const dateA = new Date(a.start.dateTime || a.start.date || '');
            const dateB = new Date(b.start.dateTime || b.start.date || '');
            return dateA.getTime() - dateB.getTime();
        });

    return (
        <div className={styles.container}>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            <div className={styles.mainLayout}>
                {/* Left Panel: Stats + Calendar + Schedule */}
                <div className={styles.leftPanel}>
                    {/* 1. Status Stats */}
                    <section className={styles.statsBoard}>
                        <div className={styles.statCard} onClick={() => onNavigateToHistory('all')} style={{ cursor: 'pointer' }}>
                            <div className={styles.statCount}>{stats.total}</div>
                            <div className={styles.statLabel}>전체 기록</div>
                        </div>
                        <div className={styles.statCard} onClick={() => onNavigateToHistory('pending')} style={{ borderColor: 'rgba(255, 255, 255, 0.1)', cursor: 'pointer' }}>
                            <div className={styles.statCount} style={{ color: '#aaa' }}>{stats.pending}</div>
                            <div className={styles.statLabel}>미완료</div>
                        </div>
                        <div className={styles.statCard} onClick={() => onNavigateToHistory('in-progress')} style={{ borderColor: 'rgba(99, 102, 241, 0.3)', cursor: 'pointer' }}>
                            <div className={styles.statCount} style={{ color: '#6366f1' }}>{stats.inProgress}</div>
                            <div className={styles.statLabel}>진행중</div>
                        </div>
                        <div className={styles.statCard} onClick={() => onNavigateToHistory('completed')} style={{ borderColor: 'rgba(16, 185, 129, 0.3)', cursor: 'pointer' }}>
                            <div className={styles.statCount} style={{ color: '#10b981' }}>{stats.completed}</div>
                            <div className={styles.statLabel}>완료</div>
                        </div>
                    </section>

                    {/* 2. Calendar & Schedule Grid */}
                    <div className={styles.contentGrid}>
                        {/* Left: Calendar Widget */}
                        <section className={styles.calendarSection}>
                            <CalendarWidget
                                events={events}
                                onDateSelect={setSelectedDate}
                                selectedDate={selectedDate}
                            />
                        </section>

                        {/* Right: Schedule List */}
                        <section className={styles.scheduleBoard}>
                            <div className={styles.scheduleHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
                                        {selectedDate
                                            ? `📅 ${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 일정`
                                            : '📅 전체 일정'}
                                    </h2>
                                    <label style={{
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        cursor: 'pointer',
                                        color: 'var(--text-secondary)',
                                        background: 'var(--bg-tertiary)',
                                        padding: '4px 8px',
                                        borderRadius: '8px'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={hidePastEvents}
                                            onChange={(e) => setHidePastEvents(e.target.checked)}
                                        />
                                        지난 일정 숨기기
                                    </label>
                                </div>

                                {selectedDate && (
                                    <button
                                        onClick={() => setSelectedDate(null)}
                                        style={{
                                            background: 'var(--bg-tertiary)',
                                            border: 'none',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        전체 보기
                                    </button>
                                )}
                                <select
                                    className={styles.viewSelect}
                                    value={calendarTab}
                                    onChange={(e) => {
                                        setCalendarTab(e.target.value as 'today' | 'week' | 'month');
                                        setSelectedDate(null);
                                    }}
                                >
                                    <option value="today">📅 오늘</option>
                                    <option value="week">📅 이번 주</option>
                                    <option value="month">📅 이번 달</option>
                                </select>
                            </div>

                            <div className={styles.scheduleCard}>
                                {loadingCalendar ? (
                                    <div className={styles.emptyState}>일정을 불러오는 중입니다...</div>
                                ) : displayedEvents.length > 0 ? (
                                    <div className={styles.eventList}>
                                        {displayedEvents.map(event => {
                                            const past = isPastEvent(event);
                                            return (
                                                <div key={event.id} className={styles.eventItem} style={{ opacity: past ? 0.5 : 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span className={styles.eventTime} style={{ textDecoration: past ? 'line-through' : 'none' }}>
                                                            {formatEventDate(event)} {formatEventTime(event)}
                                                        </span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                                                            style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '12px' }}
                                                            title="일정 삭제"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                    <a
                                                        href={event.htmlLink}
                                                        target="_blank"
                                                        className={styles.eventTitle}
                                                        style={{ textDecoration: past ? 'line-through' : 'none' }}
                                                    >
                                                        {event.summary}
                                                    </a>
                                                    {event.location && <span style={{ fontSize: '0.8rem', color: '#888' }}>{event.location}</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        {selectedDate ? '선택한 날짜에 일정이 없습니다.' : '예정된 일정이 없습니다.'}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Right Panel: News Widget */}
                <div className={styles.rightPanel}>
                    <NewsWidget />
                </div>
            </div>
        </div>
    );
}
