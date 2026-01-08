'use client';

import { useState, useEffect } from 'react';
import { saveUserSettings, subscribeToUserSettings } from '@/lib/firebaseService';

interface SubMenuSettingsManagerProps {
    workMenus: { id: string; name: string; icon: string }[];
    userId: string;
}

export default function SubMenuSettingsManager({ workMenus, userId }: SubMenuSettingsManagerProps) {
    const [subMenus, setSubMenus] = useState<Record<string, string[]>>({});
    const [selectedMenu, setSelectedMenu] = useState(workMenus[0]?.id || 'work');
    const [newTag, setNewTag] = useState('');

    useEffect(() => {
        // Subscribe to Firestore settings
        const unsubscribe = subscribeToUserSettings(userId, (settings) => {
            if (Object.keys(settings).length > 0) {
                setSubMenus(settings);
            } else {
                // Defaults if no settings exist yet
                setSubMenus({
                    'work': ['회의', '개발', '기획', '미팅'],
                    'dev': ['프론트엔드', '백엔드', '배포', '에러'],
                    'issue': ['버그', '긴급', '수정'],
                    'idea': ['기능', '디자인']
                });
            }
        });
        return () => unsubscribe();
    }, [userId]);

    // Ensure selectedMenu is valid when workMenus changes
    useEffect(() => {
        if (!workMenus.find(m => m.id === selectedMenu) && workMenus.length > 0) {
            setSelectedMenu(workMenus[0].id);
        }
    }, [workMenus, selectedMenu]);

    const saveSubMenus = async (newSubMenus: Record<string, string[]>) => {
        // Optimistic update
        setSubMenus(newSubMenus);
        // Save to Firestore
        try {
            await saveUserSettings(userId, newSubMenus);
        } catch (e) {
            console.error("Failed to save settings:", e);
            alert("설정 저장 실패");
        }
    };

    const addTag = () => {
        if (!newTag.trim()) return;
        const currentTags = subMenus[selectedMenu] || [];
        if (currentTags.includes(newTag.trim())) {
            alert('이미 존재하는 태그입니다.');
            return;
        }
        const updated = {
            ...subMenus,
            [selectedMenu]: [...currentTags, newTag.trim()]
        };
        saveSubMenus(updated);
        setNewTag('');
    };

    const removeTag = (tag: string) => {
        const currentTags = subMenus[selectedMenu] || [];
        const updated = {
            ...subMenus,
            [selectedMenu]: currentTags.filter(t => t !== tag)
        };
        saveSubMenus(updated);
    };

    const currentMenuObj = workMenus.find(m => m.id === selectedMenu);

    return (
        <section style={{ background: 'var(--bg-secondary)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔖 하위메뉴(태그) 관리
            </h3>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#aaa' }}>메뉴 선택</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {workMenus.map(menu => (
                        <button
                            key={menu.id}
                            onClick={() => setSelectedMenu(menu.id)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: selectedMenu === menu.id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                background: selectedMenu === menu.id ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-primary)',
                                color: selectedMenu === menu.id ? 'var(--primary)' : 'var(--text-primary)',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            <span>{menu.icon}</span>
                            <span>{menu.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '12px', minHeight: '100px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
                    {(subMenus[selectedMenu] || []).length === 0 ? (
                        <span style={{ color: '#888', fontSize: '0.9rem' }}>등록된 태그가 없습니다.</span>
                    ) : (
                        (subMenus[selectedMenu] || []).map(tag => (
                            <span
                                key={tag}
                                style={{
                                    background: 'var(--bg-secondary)',
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-color)',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    fontSize: '0.9rem'
                                }}
                            >
                                # {tag}
                                <button
                                    onClick={() => removeTag(tag)}
                                    style={{ border: 'none', background: 'transparent', color: '#888', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
                                >×</button>
                            </span>
                        ))
                    )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTag()}
                        placeholder="새 태그 입력 (예: 회의록)"
                        style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                    <button
                        onClick={addTag}
                        style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        추가
                    </button>
                </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '10px' }}>
                * 해당 메뉴에 글을 작성할 때, 태그가 자동으로 추천되거나 내용에 포함되면 자동 분류됩니다.
            </p>
        </section>
    );
}
