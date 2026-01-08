'use client';

import { useState, useEffect } from 'react';

interface NewsItem {
    title: string;
    link: string;
    pubDate: string;
    source: string;
}

const CATEGORIES = [
    { id: 'ALL', name: '🔥 주요뉴스' },
    { id: 'TECH', name: '💻 테크/IT' },
    { id: 'BUSINESS', name: '💰 경제' },
    { id: 'SPORTS', name: '⚽ 스포츠' },
    { id: 'ENTERTAINMENT', name: '🎬 연예' },
];

export default function NewsWidget() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [summary, setSummary] = useState(''); // AI Summary
    const [category, setCategory] = useState('ALL');
    const [loading, setLoading] = useState(true);

    const fetchNews = async (cat: string) => {
        setLoading(true);
        setSummary(''); // Reset summary
        try {
            const res = await fetch(`/api/news?category=${cat}`);
            const data = await res.json();
            setNews(data.items || []);
            setSummary(data.summary || ''); // Set summary
        } catch (error) {
            console.error('Failed to load news', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews(category);
    }, [category]);

    // Format relative time (e.g. "2 hours ago")
    const getRelativeTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (diffInSeconds < 60) return '방금 전';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
            return `${Math.floor(diffInSeconds / 86400)}일 전`;
        } catch (e) {
            return '';
        }
    };

    return (
        <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid var(--border-color)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>📰 트렌드 뉴스</h3>
                <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', maxWidth: '100%', paddingBottom: '5px' }}>
                    {/* Simplified select for mobile friendliness or specific interest tabs */}
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        style={{
                            background: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            fontSize: '0.9rem',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button
                        onClick={() => fetchNews(category)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                        title="새로고침"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* AI Summary Section */}
            {!loading && summary && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '12px',
                    padding: '12px',
                    marginBottom: '15px',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    color: 'var(--text-primary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontWeight: 'bold', color: '#818cf8' }}>
                        <span>✨ AI 요약</span>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{summary}</div>
                </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                        <div>로딩 중... ⏳</div>
                        <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>뉴스를 분석하고 있습니다</div>
                    </div>
                ) : news.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>뉴스가 없습니다.</div>
                ) : (
                    news.map((item, idx) => (
                        <a
                            key={idx}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'block',
                                padding: '12px',
                                background: 'var(--bg-primary)',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                color: 'inherit',
                                transition: 'transform 0.2s',
                                border: '1px solid transparent'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.borderColor = 'var(--primary)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'transparent';
                            }}
                        >
                            <div style={{ fontWeight: '500', marginBottom: '6px', lineHeight: '1.4' }}>
                                {item.title}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{item.source}</span>
                                <span>{getRelativeTime(item.pubDate)}</span>
                            </div>
                        </a>
                    ))
                )}
            </div>
        </div>
    );
}
