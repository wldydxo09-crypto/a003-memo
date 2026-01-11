'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { subscribeToHistory, subscribeToFeatures, subscribeToUserSettings } from '@/lib/firebaseService';

export default function MigrationPage() {
    const [user, setUser] = useState<User | null>(null);
    const [status, setStatus] = useState<'idle' | 'fetching' | 'migrating' | 'success' | 'error'>('idle');
    const [logs, setLogs] = useState<string[]>([]);

    // Data Buffers
    const [historyItems, setHistoryItems] = useState<any[]>([]);
    const [features, setFeatures] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);

    // Load status
    const [loaded, setLoaded] = useState({ history: false, features: false, settings: false });

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if (!u) {
                addLog('⚠️ 로그인이 필요합니다.');
            } else {
                addLog(`✅ 로그인 확인: ${u.email}`);
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchAllData = () => {
        if (!user) return;
        setStatus('fetching');
        setLoaded({ history: false, features: false, settings: false });
        addLog('📥 Firebase에서 데이터를 가져오는 중...');

        // 1. Fetch History
        const unsubHistory = subscribeToHistory(user.uid, { status: 'all' }, (items) => {
            setHistoryItems(items);
            setLoaded(prev => ({ ...prev, history: true }));
            addLog(`✅ History 데이터 로드 완료: ${items.length}개`);
            unsubHistory(); // One-time fetch
        });

        // 2. Fetch Features
        const unsubFeatures = subscribeToFeatures(user.uid, (items) => {
            setFeatures(items);
            setLoaded(prev => ({ ...prev, features: true }));
            addLog(`✅ Features 데이터 로드 완료: ${items.length}개`);
            unsubFeatures();
        });

        // 3. Fetch Settings
        const unsubSettings = subscribeToUserSettings(user.uid, (data) => {
            setSettings(data);
            setLoaded(prev => ({ ...prev, settings: true }));
            addLog(`✅ 설정 데이터 로드 완료: ${Object.keys(data).length}개 메뉴`);
            unsubSettings();
        });
    };

    const startMigration = async () => {
        if (!user) return;
        setStatus('migrating');
        addLog('🚀 MongoDB로 데이터 전송 시작...');

        try {
            const res = await fetch('/api/admin/migrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.uid,
                    historyItems,
                    userSettings: settings,
                    features
                })
            });

            const result = await res.json();

            if (result.success) {
                setStatus('success');
                addLog(`✨ 마이그레이션 성공! ${result.message}`);
                alert('마이그레이션이 완료되었습니다!');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            setStatus('error');
            addLog(`❌ 오류 발생: ${error.message}`);
            alert(`오류: ${error.message}`);
        }
    };

    const isReadyToMigrate = loaded.history && loaded.features && loaded.settings && status === 'fetching';

    if (!user) {
        return <div style={{ padding: 40, color: 'white' }}>로그인이 필요합니다.</div>;
    }

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', color: '#fff', background: '#111', minHeight: '100vh' }}>
            <h1 style={{ marginBottom: '20px' }}>🔄 데이터 마이그레이션 (Firebase → MongoDB)</h1>

            <div style={{ background: '#222', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
                <h3>1단계: 데이터 가져오기</h3>
                <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Firebase에서 현재 사용자의 모든 데이터를 조회합니다.</p>
                <button
                    onClick={fetchAllData}
                    disabled={status !== 'idle'}
                    style={{
                        marginTop: '10px', padding: '10px 20px',
                        background: loaded.history ? '#555' : '#6366f1',
                        color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'
                    }}
                >
                    {loaded.history ? '데이터 로드됨' : '데이터 가져오기'}
                </button>

                <div style={{ marginTop: '15px', display: 'flex', gap: '20px' }}>
                    <div style={{ color: loaded.history ? '#4ade80' : '#666' }}>• History: {historyItems.length}개</div>
                    <div style={{ color: loaded.features ? '#4ade80' : '#666' }}>• Features: {features.length}개</div>
                    <div style={{ color: loaded.settings ? '#4ade80' : '#666' }}>• Settings: {settings ? 'Loaded' : '-'}</div>
                </div>
            </div>

            <div style={{ background: '#222', padding: '20px', borderRadius: '10px', marginBottom: '20px', opacity: isReadyToMigrate ? 1 : 0.5 }}>
                <h3>2단계: MongoDB로 전송</h3>
                <p style={{ color: '#aaa', fontSize: '0.9rem' }}>가져온 데이터를 MongoDB에 안전하게 저장합니다. (기존 데이터 유지)</p>
                <button
                    onClick={startMigration}
                    disabled={!isReadyToMigrate}
                    style={{
                        marginTop: '10px', padding: '12px 25px',
                        background: isReadyToMigrate ? '#10b981' : '#444',
                        color: 'white', border: 'none', borderRadius: '5px',
                        cursor: isReadyToMigrate ? 'pointer' : 'not-allowed',
                        fontSize: '1rem', fontWeight: 'bold'
                    }}
                >
                    {status === 'migrating' ? '전송 중...' : '마이그레이션 시작'}
                </button>
            </div>

            <div style={{ background: '#000', padding: '15px', borderRadius: '8px', fontFamily: 'monospace', height: '300px', overflowY: 'auto', border: '1px solid #333' }}>
                {logs.length === 0 && <span style={{ color: '#555' }}>로그 대기 중...</span>}
                {logs.map((log, i) => (
                    <div key={i} style={{ marginBottom: '5px', color: '#ddd' }}>{log}</div>
                ))}
            </div>
        </div>
    );
}
