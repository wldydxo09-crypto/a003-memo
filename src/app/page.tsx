'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Login from '@/components/Login';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import InventoryDashboard from '@/components/InventoryDashboard';
import HistoryList from '@/components/HistoryList';
import WriteModal from '@/components/WriteModal';
import SubMenuSettingsManager from '@/components/SubMenuSettingsManager';
import styles from './page.module.css';
import { useModalBack } from '@/hooks/useModalBack';

// Mock User type to compat with existing components
// We can gradually replace this with NextAuth's User type
type UserCompat = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
};

export default function Home() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // Backwards compatibility for User object (mapping id -> uid)
  const user = session?.user ? {
    ...session.user,
    uid: session.user.id,
    photoURL: session.user.image,
    displayName: session.user.name
  } : null;

  const loading = status === 'loading';

  // Use searchParams for current menu, default to 'dashboard'
  const currentMenu = searchParams.get('menu') || 'dashboard';

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Write Modal State
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [writeInitialMenu, setWriteInitialMenu] = useState('work');

  // Handle Back Button for Write Modal
  useModalBack(isWriteModalOpen, () => setIsWriteModalOpen(false));

  // History Filter State
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyLabel, setHistoryLabel] = useState<string | null>(null);

  // Work Menus State
  const [workMenus, setWorkMenus] = useState<{ id: string; name: string; icon: string }[]>([
    { id: 'work', name: '업무 일지', icon: '📝' },
    { id: 'dev', name: '개발 노트', icon: '💻' },
    { id: 'meeting', name: '회의/일정', icon: '📅' },
    { id: 'issue', name: '이슈/버그', icon: '🐛' },
    { id: 'idea', name: '아이디어', icon: '💡' },
  ]);

  // Load Menus from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('my_work_menus');
    // Handle Logout
    const handleLogout = async () => {
      try {
        await signOut(); // NextAuth signOut
      } catch (error) {
        console.error('Logout error:', error);
      }
    };
    if (saved) {
      try {
        setWorkMenus(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse menus');
      }
    }
  }, []);

  // Save Menus
  const saveWorkMenus = (newMenus: typeof workMenus) => {
    setWorkMenus(newMenus);
    localStorage.setItem('my_work_menus', JSON.stringify(newMenus));
  };

  // Mobile Sidebar State
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Handle Back Button for Mobile Sidebar
  useModalBack(isMobileOpen, () => setIsMobileOpen(false));

  // --- Advanced Back Button & History Management ---
  // Replaced manual history management with Next.js Router

  // Wrapper for Menu Change to support History
  // We will pass this to Sidebar instead of setCurrentMenu directly
  const handleMenuChangeWithHistory = (menuId: string) => {
    if (menuId === currentMenu) return;

    // Use Router Push
    router.push(`?menu=${menuId}`);
    // setCurrentMenu(menuId); -> No longer needed, as searchParams will update
  };

  // Double Back to Exit Logic
  // With standard router, browser back button just works.
  // We can't implement "Double Tap to Exit" perfectly in a standard web page 
  // without trapping the user, which is bad practice/hard. 
  // But we can ensure "Back -> Dashboard".

  // We need to update Sidebar's onMenuChange prop

  useEffect(() => {
    // Session is handled by useSession, no manual listener needed
  }, []);

  const handleOpenWrite = (menuId: string = 'work') => {
    setWriteInitialMenu(menuId);
    setIsWriteModalOpen(true);
  };

  const handleNavigateToHistory = (
    filter: 'all' | 'pending' | 'in-progress' | 'completed',
    searchQuery?: string,
    label?: string | null
  ) => {
    setHistoryFilter(filter);
    setHistoryLabel(label || null);
    if (searchQuery !== undefined) {
      setHistorySearchQuery(searchQuery);
    } else {
      setHistorySearchQuery('');
    }

    // Use History Push
    router.push(`?menu=history`);
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (!user) return <Login />;

  // ... (getMenuTitle remains same) ...

  // Helper to replace direct setCurrentMenu calls with history friendly one
  // Check Sidebar props: onMenuChange={setCurrentMenu} -> {handleMenuChangeWithHistory}


  const getMenuTitle = (id: string) => {
    const titles: Record<string, string> = {
      dashboard: '대시보드',
      inventory: '기능 보관함',
      history: '전체 이력',
      settings: '설정',
    };

    // Check dynamic menus
    const found = workMenus.find(m => m.id === id);
    if (found) return found.name;

    return titles[id] || 'Smart Assistant';
  };

  const themes = [
    { name: 'Purple', primary: '#6366f1', dark: '#4f46e5', light: '#818cf8', accent: '#f472b6', glow1: 'rgba(99, 102, 241, 0.15)', glow2: 'rgba(244, 114, 182, 0.1)' },
    { name: 'Blue', primary: '#3b82f6', dark: '#2563eb', light: '#60a5fa', accent: '#f472b6', glow1: 'rgba(59, 130, 246, 0.15)', glow2: 'rgba(147, 51, 234, 0.1)' },
    { name: 'Green', primary: '#10b981', dark: '#059669', light: '#34d399', accent: '#f59e0b', glow1: 'rgba(16, 185, 129, 0.15)', glow2: 'rgba(245, 158, 11, 0.1)' },
    { name: 'Orange', primary: '#f97316', dark: '#ea580c', light: '#fb923c', accent: '#22d3ee', glow1: 'rgba(249, 115, 22, 0.15)', glow2: 'rgba(34, 211, 238, 0.1)' },
    { name: 'Pink', primary: '#ec4899', dark: '#db2777', light: '#f472b6', accent: '#6366f1', glow1: 'rgba(236, 72, 153, 0.15)', glow2: 'rgba(99, 102, 241, 0.1)' },
  ];

  const changeTheme = (theme: typeof themes[0]) => {
    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--primary-dark', theme.dark);
    document.documentElement.style.setProperty('--primary-light', theme.light);
    document.documentElement.style.setProperty('--accent', theme.accent);
    document.documentElement.style.setProperty('--glow-primary', theme.glow1);
    document.documentElement.style.setProperty('--glow-secondary', theme.glow2);
  };

  // ... (existing effects) ...

  return (
    <div className={styles.layout}>
      <Sidebar
        currentMenu={currentMenu}
        onMenuChange={handleMenuChangeWithHistory}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        onOpenWrite={() => handleOpenWrite('work')}
        user={user}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        workMenus={workMenus}
        onSearch={(query) => handleNavigateToHistory('all', query)}
        onTagSelect={(tag: string) => handleNavigateToHistory('all', undefined, tag)}
      />

      <main className={`${styles.main} ${isCollapsed ? styles.expanded : ''}`}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Mobile Hamburger - Visible only on mobile via CSS media query usually, or inline style for now */}
              <button
                className={styles.mobileMenuBtn}
                onClick={() => setIsMobileOpen(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'none' // default hidden
                }}
              >
                ☰
              </button>
              <div>
                <h1 className={styles.pageTitle}>{getMenuTitle(currentMenu)}</h1>
                {/* Date display moved here or keep simple */}
              </div>
            </div>
          </div>

          <div className={styles.headerRight}>
            {/* Add Date or User here if needed */}
          </div>
        </header>

        <div className={styles.content}>
          {currentMenu === 'dashboard' ? (
            <Dashboard
              userId={user.uid}
              onOpenWrite={handleOpenWrite}
              onNavigateToHistory={handleNavigateToHistory}
            />
          ) : currentMenu === 'inventory' ? (
            <InventoryDashboard userId={user.uid} />
          ) : currentMenu === 'history' ? (
            <HistoryList
              userId={user.uid}
              initialFilter={historyFilter}
              initialSearchQuery={historySearchQuery}
              initialLabel={historyLabel}
            />
          ) : currentMenu === 'settings' ? (
            <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '30px', fontWeight: '700' }}>설정</h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

                {/* Theme Section */}
                <section style={{ background: 'var(--bg-secondary)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>🎨 테마 설정</h3>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {themes.map(theme => (
                      <button
                        key={theme.name}
                        onClick={() => changeTheme(theme)}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: theme.primary,
                          border: '3px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                        }}
                        title={theme.name}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    ))}
                  </div>
                </section>

                {/* Menu Editor Section */}
                <section style={{ background: 'var(--bg-secondary)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>📋 WORK 메뉴 관리</h3>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {workMenus.map((menu, idx) => (
                      <li key={menu.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-primary)', padding: '10px 15px', borderRadius: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.2rem' }}>{menu.icon}</span>
                          <span style={{ fontWeight: '500' }}>{menu.name}</span>
                        </span>
                        <button
                          onClick={() => {
                            if (confirm(`'${menu.name}' 메뉴를 삭제하시겠습니까?`)) {
                              saveWorkMenus(workMenus.filter(m => m.id !== menu.id));
                            }
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}
                        >
                          🗑️
                        </button>
                      </li>
                    ))}
                  </ul>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const nameInput = form.elements.namedItem('menuName') as HTMLInputElement;
                      const iconInput = form.elements.namedItem('menuIcon') as HTMLInputElement;
                      const name = nameInput.value;
                      const icon = iconInput.value || '📝';
                      if (!name) return;
                      const newId = `custom_${Date.now()}`;
                      saveWorkMenus([...workMenus, { id: newId, name, icon }]);
                      form.reset();
                    }}
                    style={{ display: 'flex', gap: '8px' }}
                  >
                    <input name="menuIcon" placeholder="이모지" style={{ width: '60px', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', textAlign: 'center' }} />
                    <input name="menuName" placeholder="새 메뉴 이름" style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer' }}>추가</button>
                  </form>
                </section>

                {/* Sub-menu (Tag) Manager Section */}
                <SubMenuSettingsManager workMenus={workMenus} userId={user.uid} />

                {/* AI Settings */}
                <section style={{ background: 'var(--bg-secondary)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>🤖 AI 설정</h3>
                  <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '10px' }}>
                    <p style={{ fontSize: '0.85rem', color: '#ccc', marginBottom: '10px' }}>
                      기본 AI 사용량이 초과된 경우, 개인 Gemini API Key를 입력하여 계속 사용할 수 있습니다.
                      <br /><span style={{ fontSize: '0.8rem', color: '#888' }}>(키는 브라우저에만 저장되며 서버로 안전하게 전송됩니다)</span>
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const input = (e.target as HTMLFormElement).elements.namedItem('apiKey') as HTMLInputElement;
                        localStorage.setItem('smartWork_geminiKey', input.value.trim());
                        alert('API Key가 저장되었습니다.');
                      }}
                      style={{ display: 'flex', gap: '8px' }}
                    >
                      <input
                        name="apiKey"
                        type="password"
                        placeholder="Gemini API Key 입력 (선택사항)"
                        defaultValue={typeof window !== 'undefined' ? localStorage.getItem('smartWork_geminiKey') || '' : ''}
                        style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      />
                      <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer' }}>저장</button>
                    </form>
                    <div style={{ marginTop: '8px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem('smartWork_geminiKey');
                          alert('저장된 API Key가 삭제되었습니다. (기본 설정 사용)');
                          // Force reload to clear input visually if needed or just let user refresh
                          window.location.reload();
                        }}
                        style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        저장된 키 삭제 (초기화)
                      </button>
                    </div>
                  </div>
                </section>

                {/* External Connection */}
                <section style={{ background: 'var(--bg-secondary)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>🔗 외부 연동</h3>
                  <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '4px' }}>Google Calendar</h4>
                      <p style={{ fontSize: '0.8rem', color: '#aaa' }}>일정 동기화</p>
                    </div>
                    <button
                      onClick={() => {
                        window.location.href = '/api/auth/google';
                      }}
                      style={{ padding: '6px 12px', background: 'var(--primary)', border: 'none', borderRadius: '6px', color: 'white', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      연동
                    </button>
                  </div>
                </section>

                {/* App Update / Cache Clear */}
                <section style={{ background: 'var(--bg-secondary)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>🔄 앱 업데이트 / 캐시</h3>
                  <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '10px' }}>
                    <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '15px', lineHeight: '1.5' }}>
                      모바일에서 최신 기능이 보이지 않거나 오류가 발생할 때 사용하세요.
                    </p>
                    <button
                      onClick={() => {
                        if (confirm('페이지를 새로고침 하시겠습니까?')) {
                          // Cache busting reload
                          window.location.href = window.location.pathname + '?t=' + new Date().getTime();
                        }
                      }}
                      style={{ width: '100%', padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      ⚡ 최신 버전으로 새로고침
                    </button>
                    <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '10px', textAlign: 'center' }}>
                      Build: {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </section>

                {/* Account */}
                <section style={{ background: 'var(--bg-secondary)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>👤 계정 정보</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      {user.photoURL && <img src={user.photoURL} alt="Profile" style={{ width: '50px', height: '50px', borderRadius: '50%' }} />}
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{user.displayName}</div>
                        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>{user.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => signOut()}
                      style={{ width: '100%', padding: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                    >
                      로그아웃
                    </button>
                  </div>
                </section>
              </div>
            </div>
          ) : (
            /* Default to HistoryList for Specific Menus */
            <HistoryList userId={user.uid} menuId={currentMenu} />
          )}
        </div>
      </main >

      {/* Global Write Modal */}
      < WriteModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)
        }
        userId={user.uid}
        initialMenuId={writeInitialMenu}
      />
    </div >
  );
}
