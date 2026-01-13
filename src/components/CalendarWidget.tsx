'use client';

import { useState, useEffect } from 'react';
import styles from './CalendarWidget.module.css';

export interface CalendarEvent {
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    location?: string;
    htmlLink: string;
}

interface CalendarWidgetProps {
    events: CalendarEvent[];
    selectedDate?: Date | null;
    onDateSelect?: (date: Date) => void;
    currentDate?: Date; // Parent controlled date
    onNavigate?: (date: Date) => void;
    onAddEvent?: (date: Date) => void;
}

export default function CalendarWidget({ events, selectedDate, onDateSelect, currentDate: propDate, onNavigate, onAddEvent }: CalendarWidgetProps) {
    // Internal state for fallback or if not controlled
    const [internalDate, setInternalDate] = useState<Date>(new Date());

    const displayDate = propDate || internalDate;

    if (!displayDate) return null;

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const prevMonth = () => {
        const newDate = new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1);
        if (onNavigate) {
            onNavigate(newDate);
        } else {
            setInternalDate(newDate);
        }
    };

    const nextMonth = () => {
        const newDate = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1);
        if (onNavigate) {
            onNavigate(newDate);
        } else {
            setInternalDate(newDate);
        }
    };

    const daysInMonth = getDaysInMonth(displayDate);
    const firstDay = getFirstDayOfMonth(displayDate);
    const today = new Date();

    const renderDays = () => {
        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className={`${styles.day} ${styles.empty}`} />);
        }

        // Days
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(displayDate.getFullYear(), displayDate.getMonth(), d);
            const isToday = date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();

            const isSelected = selectedDate &&
                date.getDate() === selectedDate.getDate() &&
                date.getMonth() === selectedDate.getMonth() &&
                date.getFullYear() === selectedDate.getFullYear();

            const dayEvents = events.filter(e => {
                const eDate = e.start.dateTime ? new Date(e.start.dateTime) : new Date(e.start.date || '');
                return eDate.getDate() === d &&
                    eDate.getMonth() === displayDate.getMonth() &&
                    eDate.getFullYear() === displayDate.getFullYear();
            });

            days.push(
                <div
                    key={d}
                    className={`${styles.day} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
                    onClick={() => onDateSelect?.(date)}
                >
                    <span>{d}</span>
                    <div style={{ display: 'flex', gap: '2px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {dayEvents.slice(0, 3).map((e, i) => (
                            <div key={i} className={styles.eventDot} title={e.summary} />
                        ))}
                        {dayEvents.length > 3 && <span style={{ fontSize: '8px', lineHeight: 1 }}>+</span>}
                    </div>
                    {isSelected && onAddEvent && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddEvent(date);
                            }}
                            className={styles.addEventBtn}
                            title="일정 추가"
                        >
                            +
                        </button>
                    )}
                </div>
            );
        }

        return days;
    };

    const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.title}>
                    {displayDate.getFullYear()}년 {monthNames[displayDate.getMonth()]}
                </span>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <button className={styles.navBtn} onClick={prevMonth}>&lt;</button>
                    <button className={styles.navBtn} onClick={nextMonth}>&gt;</button>
                </div>
            </div>

            <div className={styles.grid}>
                {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                    <div key={d} className={styles.weekday}>{d}</div>
                ))}
                {renderDays()}
            </div>
        </div>
    );
}
