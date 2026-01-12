'use client';

import { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';

// Generic User Interface compatible with NextAuth
interface User {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
}

interface SidebarProps {
    currentMenu: string;
    onMenuChange: (menuId: string) => void;
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    onOpenWrite: () => void;
    user: User | null;
    isMobileOpen?: boolean;
    onCloseMobile?: () => void;
    workMenus?: { id: string; name: string; icon: string }[];
    onSearch: (query: string) => void;
    onTagSelect: (tag: string) => void;
}

// import { subscribeToUserSettings } from '@/lib/firebaseService'; // Removed for MongoDB migration

export default function Sidebar({ currentMenu, onMenuChange, isCollapsed, setIsCollapsed, onOpenWrite, user, isMobileOpen, onCloseMobile, workMenus, onSearch, onTagSelect }: SidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [subMenus, setSubMenus] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (!user) return;

        const loadSettings = async () => {
            try {
                const response = await fetch('/api/settings');
                if (response.ok) {
                    const data = await response.json();
                    if (data && Object.keys(data).length > 0) {
                        setSubMenus(data);
                        return;
                    }
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            }

            // Defaults
            setSubMenus({
                'work': ['회의', '개발', '기획', '미팅'],
                'dev': ['프론트엔드', '백엔드', '배포', '에러'],
                'issue': ['버그', '긴급', '수정'],
                'idea': ['기능', '디자인']
            });
        };

        loadSettings();
    }, [user]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            onSearch(searchQuery.trim());
            setSearchQuery(''); // Clear input after search
            if (onCloseMobile) onCloseMobile();
        }
    };

    const handleMenuClick = (id: string) => {
        onMenuChange(id);
        if (onCloseMobile) onCloseMobile();
    };

    // Navigation Items
    const MAIN_MENU = [
        { id: 'dashboard', name: '대시보드', icon: '📊' },
    ];

    // Default if not provided
    const DEFAULT_WORK_MENUS = [
        { id: 'work', name: '업무 일지', icon: '📝' },
        { id: 'dev', name: '개발 노트', icon: '💻' },
        { id: 'meeting', name: '회의/일정', icon: '📅' },
        { id: 'issue', name: '이슈/버그', icon: '🐛' },
        { id: 'idea', name: '아이디어', icon: '💡' },
    ];

    const displayWorkMenus = workMenus && workMenus.length > 0 ? workMenus : DEFAULT_WORK_MENUS;

    const MANAGEMENT_MENUS = [
        { id: 'inventory', name: '기능 보관함', icon: '📦' },
        { id: 'history', name: '전체 이력', icon: '📂' },
        { id: 'settings', name: '설정', icon: '⚙️' },
    ];

    // Mobile Resize Handler
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 900) {
                if (isCollapsed) setIsCollapsed(false);
            }
        };

        // Run on mount
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isCollapsed, setIsCollapsed]);

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`${styles.overlay} ${isMobileOpen ? styles.visible : ''}`}
                onClick={onCloseMobile}
            />

            <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${isMobileOpen ? styles.mobileOpen : ''}`}>

                {/* Header / Toggle */}
                <div className={styles.header}>
                    <button
                        className={styles.collapseBtn}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        {isCollapsed ? '☰' : 'Smart Assistant'}
                    </button>
                    {/* Mobile Header Title inside Sidebar optional */}
                    <div style={{ display: 'none', marginLeft: 'auto' }} className="mobile-close">
                        <button onClick={onCloseMobile} style={{ background: 'none', border: 'none', color: 'white' }}>×</button>
                    </div>
                </div>

                {/* Global Write Button */}
                <div className={styles.writeSection}>
                    <button
                        type="button"
                        className={styles.writeBtn}
                        onClick={(e) => {
                            e.preventDefault();
                            if (onCloseMobile) onCloseMobile();
                            // Delay opening write modal to allow sidebar history cleanup to finish.
                            // 300ms is a safe buffer for browser history transitions.
                            setTimeout(() => {
                                onOpenWrite();
                            }, 300);
                        }}
                        title="새 기록 작성"
                    >
                        <span className={styles.writeIcon}>✏️</span>
                        {!isCollapsed && <span className={styles.writeText}>새 기록</span>}
                    </button>

                    {!isCollapsed && (
                        <form onSubmit={handleSearchSubmit} className={styles.searchForm} style={{ display: 'flex', gap: '6px' }}>
                            <input
                                type="text"
                                placeholder="검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    width: '100%'
                                }}
                            />
                            <button type="submit" style={{ background: 'var(--primary)', border: 'none', borderRadius: '8px', width: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                                🔍
                            </button>
                        </form>
                    )}
                </div>

                {/* Navigation */}
                <div className={styles.navList}>
                    {MAIN_MENU.map(item => (
                        <button
                            key={item.id}
                            className={`${styles.navItem} ${currentMenu === item.id ? styles.active : ''}`}
                            onClick={() => handleMenuClick(item.id)}
                            title={item.name}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            {!isCollapsed && <span className={styles.navText}>{item.name}</span>}
                        </button>
                    ))}

                    <div className={styles.divider} />
                    {!isCollapsed && <div className={styles.sectionTitle}>WORK</div>}

                    {displayWorkMenus.map(item => (
                        <div key={item.id}>
                            <button
                                className={`${styles.navItem} ${currentMenu === item.id ? styles.active : ''}`}
                                onClick={() => handleMenuClick(item.id)}
                                title={item.name}
                            >
                                <span className={styles.navIcon}>{item.icon}</span>
                                <span className={`${styles.navText} ${isCollapsed ? styles.hidden : ''}`}>{item.name}</span>
                            </button>
                            {/* Sub Menus (Tags) */}
                            {(!isCollapsed || window.innerWidth <= 900) && subMenus[item.id] && subMenus[item.id].length > 0 && (
                                <div style={{ paddingLeft: '44px', display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                                    {subMenus[item.id].map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => {
                                                onTagSelect(tag);
                                                if (onCloseMobile) onCloseMobile();
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#888',
                                                fontSize: '0.85rem',
                                                textAlign: 'left',
                                                padding: '4px 8px',
                                                cursor: 'pointer',
                                                borderRadius: '4px',
                                                transition: 'color 0.2s, background 0.2s',
                                                display: 'flex', alignItems: 'center', gap: '6px'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.color = 'var(--text-primary)';
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.color = '#888';
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>↳</span> {tag}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    <div className={styles.divider} />
                    {!isCollapsed && <div className={styles.sectionTitle}>MANAGEMENT</div>}

                    {MANAGEMENT_MENUS.map(item => (
                        <button
                            key={item.id}
                            className={`${styles.navItem} ${currentMenu === item.id ? styles.active : ''}`}
                            onClick={() => handleMenuClick(item.id)}
                            title={item.name}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            {!isCollapsed && <span className={styles.navText}>{item.name}</span>}
                        </button>
                    ))}
                </div>

                {/* User Profile */}
                <div className={styles.footer}>
                    <div className={styles.userAvatar}>
                        {user?.photoURL ? <img src={user.photoURL} className={styles.avatarImg} alt="User" /> : '👤'}
                    </div>
                    {!isCollapsed && (
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>{user?.displayName || '사용자'}</span>
                            <span className={styles.userRole}>{user?.email}</span>
                        </div>
                    )}
                </div>
            </div>
        </>
    );

}
