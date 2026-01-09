'use client';

import { useState, useEffect } from 'react';
import styles from './SettingsModal.module.css';
import { MENUS } from '@/lib/menus';
import { saveUserSettings, subscribeToUserSettings } from '@/lib/firebaseService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export default function SettingsModal({ isOpen, onClose, userId }: SettingsModalProps) {
    const [subMenus, setSubMenus] = useState<{ [key: string]: string[] }>({});
    const [selectedMenu, setSelectedMenu] = useState('dev');
    const [newTag, setNewTag] = useState('');

    useEffect(() => {
        if (isOpen && userId) {
            const unsubscribe = subscribeToUserSettings(userId, (settings) => {
                setSubMenus(settings);
                // Sync to localStorage for WriteModal to use
                localStorage.setItem('smartWork_subMenus', JSON.stringify(settings));
            });
            return () => unsubscribe();
        }
    }, [isOpen, userId]);

    const saveSettings = async (newSettings: { [key: string]: string[] }) => {
        // Optimistic update
        setSubMenus(newSettings);
        // Sync to localStorage for WriteModal to use
        localStorage.setItem('smartWork_subMenus', JSON.stringify(newSettings));
        // Save to Firestore
        try {
            await saveUserSettings(userId, newSettings);
        } catch (e) {
            console.error("Failed to save settings:", e);
            alert("설정 저장 실패");
        }
    };

    const addTag = () => {
        if (!newTag.trim()) return;
        const currentTags = subMenus[selectedMenu] || [];
        if (currentTags.includes(newTag.trim())) return;

        const updated = {
            ...subMenus,
            [selectedMenu]: [...currentTags, newTag.trim()]
        };
        saveSettings(updated);
        setNewTag('');
    };

    const removeTag = (tag: string) => {
        const currentTags = subMenus[selectedMenu] || [];
        const updated = {
            ...subMenus,
            [selectedMenu]: currentTags.filter(t => t !== tag)
        };
        saveSettings(updated);
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
            backdropFilter: 'blur(5px)'
        }}>
            <div style={{
                background: '#1e1e1e', padding: '30px', borderRadius: '16px', width: '500px', maxWidth: '90%',
                border: '1px solid #333', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
                <h2 style={{ margin: '0 0 20px 0', color: 'white' }}>⚙️ 설정 (Settings)</h2>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: '#ccc', display: 'block', marginBottom: '8px' }}>메뉴 선택</label>
                    <select
                        value={selectedMenu}
                        onChange={(e) => setSelectedMenu(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#252525', border: '1px solid #444', color: 'white' }}
                    >
                        {MENUS.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: '#ccc', display: 'block', marginBottom: '8px' }}>하위 메뉴 (자동 분류 키워드)</label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="추가할 키워드 입력 (예: React)"
                            onKeyDown={(e) => e.key === 'Enter' && addTag()}
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#252525', border: '1px solid #444', color: 'white' }}
                        />
                        <button onClick={addTag} style={{ background: '#6366f1', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', cursor: 'pointer' }}>추가</button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '100px', background: '#111', padding: '10px', borderRadius: '8px' }}>
                        {(subMenus[selectedMenu] || []).map(tag => (
                            <span key={tag} style={{ background: '#333', padding: '4px 10px', borderRadius: '12px', fontSize: '14px', color: '#eee', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {tag}
                                <button onClick={() => removeTag(tag)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '16px' }}>×</button>
                            </span>
                        ))}
                        {(subMenus[selectedMenu] || []).length === 0 && <span style={{ color: '#666', fontSize: '14px' }}>등록된 하위 메뉴가 없습니다.</span>}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#444', color: 'white', cursor: 'pointer' }}>닫기</button>
                </div>
            </div>
        </div>
    );
}
