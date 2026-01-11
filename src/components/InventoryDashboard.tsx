'use client';
// v2.0 - Simplified form for spreadsheet projects (2026-01-09)

import { useState, useEffect } from 'react';
import { useModalBack } from '@/hooks/useModalBack';
import { subscribeToFeatures, addFeature, updateFeature, deleteFeature, FeatureItem } from '@/lib/firebaseService';
import styles from './InventoryDashboard.module.css';
import MermaidRenderer from './MermaidRenderer';

interface InventoryDashboardProps {
    userId: string;
}

const INITIAL_FORM = {
    name: '',
    fileName: '',
    description: '',
    sheetNames: '', // Comma separated
    keyFunctions: '', // Format: "functionName: description" per line
    triggerInfo: '',
    emailNotification: false,
    status: 'in-progress' as const,
};

export default function InventoryDashboard({ userId }: InventoryDashboardProps) {
    const [activeTab, setActiveTab] = useState<'list' | 'architecture'>('list');
    const [features, setFeatures] = useState<FeatureItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    useModalBack(isModalOpen, () => setIsModalOpen(false));
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<{
        name: string;
        fileName: string;
        description: string;
        sheetNames: string;
        keyFunctions: string;
        triggerInfo: string;
        emailNotification: boolean;
        status: 'planned' | 'in-progress' | 'completed' | 'maintenance';
    }>(INITIAL_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Architecture State
    const [mermaidCode, setMermaidCode] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Initial Load
    useEffect(() => {
        const unsubscribe = subscribeToFeatures(userId, (items) => {
            setFeatures(items);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    const handleOpenModal = (feature?: FeatureItem) => {
        if (feature) {
            setEditingId(feature.id || null);
            setFormData({
                name: feature.name,
                fileName: (feature as any).fileName || '',
                description: feature.description,
                sheetNames: feature.sheetNames?.join(', ') || '',
                keyFunctions: feature.keyFunctions?.map(f => `${f.name}: ${f.description}`).join('\n') || '',
                triggerInfo: feature.triggerInfo || '',
                emailNotification: !!feature.triggerInfo?.includes('메일') || !!feature.triggerInfo?.includes('mail'),
                status: feature.status as any,
            });
        } else {
            setEditingId(null);
            setFormData(INITIAL_FORM);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData(INITIAL_FORM);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deleteFeature(id);
        } catch (error) {
            console.error('Delete error:', error);
            alert('삭제 실패');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setIsSubmitting(true);
        try {
            // Parse sheetNames (comma separated)
            const sheetNamesArray = formData.sheetNames
                .split(',')
                .map((s: string) => s.trim())
                .filter((s: string) => s);

            // Parse keyFunctions (newline separated, format: "name: description")
            const keyFunctionsArray = formData.keyFunctions
                .split('\n')
                .map((line: string) => {
                    const [name, ...descParts] = line.split(':');
                    return { name: name?.trim() || '', description: descParts.join(':').trim() };
                })
                .filter((f: { name: string }) => f.name);

            // Append email info to triggerInfo if emailNotification is checked
            let triggerInfoText = formData.triggerInfo;
            if (formData.emailNotification && !triggerInfoText.includes('메일')) {
                triggerInfoText = triggerInfoText ? `${triggerInfoText}, 메일 발송` : '메일 발송';
            }

            const data: any = {
                userId,
                name: formData.name,
                description: formData.description,
                status: formData.status,
                type: 'spreadsheet',
                priority: 'medium',
                techStack: ['Google Apps Script'],
                progress: formData.status === 'completed' ? 100 : 0,
            };

            // Only add optional fields if they have values (Firestore rejects undefined)
            if (sheetNamesArray.length > 0) data.sheetNames = sheetNamesArray;
            if (keyFunctionsArray.length > 0) data.keyFunctions = keyFunctionsArray;
            if (triggerInfoText) data.triggerInfo = triggerInfoText;

            if (editingId) {
                await updateFeature(editingId, data);
            } else {
                await addFeature(data);
            }
            handleCloseModal();
        } catch (error: any) {
            console.error('Submit error:', error);
            console.error('Error details:', error.message, error.code);
            alert(`저장 실패: ${error.message || '알 수 없는 오류'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGenerateArchitecture = async () => {
        if (features.length === 0) {
            alert('등록된 기능이 없습니다. 먼저 기능을 등록해주세요.');
            return;
        }

        setIsGenerating(true);
        try {
            const response = await fetch('/api/architecture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ features }),
            });
            const data = await response.json();

            if (response.ok && data.mermaidCode) {
                setMermaidCode(data.mermaidCode);
            } else {
                throw new Error(data.error || 'Failed to generate');
            }
        } catch (error) {
            console.error('Architecture Generation Error:', error);
            alert('아키텍처 생성 중 오류가 발생했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return '#10b981'; // Green
            case 'in-progress': return '#3b82f6'; // Blue
            case 'maintenance': return '#f59e0b'; // Orange
            default: return '#6b7280'; // Gray
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed': return '완료';
            case 'in-progress': return '진행중';
            case 'maintenance': return '보수';
            case 'planned': return '계획';
            default: return status;
        }
    };

    return (
        <div className={styles.container}>
            {/* Header / Tabs */}
            <div className={styles.header}>
                <h1 className={styles.title}>📦 기능 보관함 (Feature Inventory)</h1>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'list' ? styles.active : ''}`}
                        onClick={() => setActiveTab('list')}
                    >
                        목록
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'architecture' ? styles.active : ''}`}
                        onClick={() => setActiveTab('architecture')}
                    >
                        청사진 (AI Architecture)
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>불러오는 중...</div>
                ) : activeTab === 'list' ? (
                    <>
                        <div className={styles.searchContainer}>
                            <input
                                type="text"
                                placeholder="🔍 기능 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.searchInput}
                            />
                            <button
                                className={styles.addBtn}
                                onClick={() => handleOpenModal()}
                                style={{ flex: 1, minWidth: '120px' }}
                            >
                                <span>+ 새 기능</span>
                            </button>
                        </div>

                        <div className={styles.list}>
                            {features
                                .filter(f => {
                                    if (!searchTerm.trim()) return true;
                                    const term = searchTerm.toLowerCase();
                                    return (
                                        f.name.toLowerCase().includes(term) ||
                                        f.description.toLowerCase().includes(term) ||
                                        f.sheetNames?.some(s => s.toLowerCase().includes(term)) ||
                                        f.triggerInfo?.toLowerCase().includes(term)
                                    );
                                })
                                .map(f => (
                                    <div key={f.id} className={styles.card}>
                                        <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <span
                                                className={styles.statusBadge}
                                                style={{ backgroundColor: `${getStatusColor(f.status)}20`, color: getStatusColor(f.status) }}
                                            >
                                                {getStatusText(f.status)}
                                            </span>
                                            <div style={{ gap: '5px', display: 'flex' }}>
                                                <button
                                                    onClick={() => handleOpenModal(f)}
                                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}
                                                >✏️</button>
                                                <button
                                                    onClick={() => f.id && handleDelete(f.id)}
                                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}
                                                >🗑️</button>
                                            </div>
                                        </div>
                                        <h3 className={styles.cardTitle}>{f.name}</h3>
                                        <p className={styles.cardDesc}>{f.description}</p>

                                        <div className={styles.cardFooter}>
                                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                {f.techStack.slice(0, 3).map(tech => (
                                                    <span key={tech} style={{ fontSize: '0.75rem', padding: '2px 6px', background: '#eee', borderRadius: '4px', color: '#555' }}>
                                                        {tech}
                                                    </span>
                                                ))}
                                                {f.techStack.length > 3 && <span style={{ fontSize: '0.75rem' }}>+{f.techStack.length - 3}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </>
                ) : (
                    <div className={styles.architectureContainer}>
                        <div className={styles.architectureHeader} style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '1.2rem', marginBottom: '5px' }}>시스템 청사진 (Blueprint)</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>AI가 등록된 기능을 분석하여 시스템 구조도를 그려줍니다.</p>
                            </div>
                            <button
                                className={styles.submitBtn}
                                onClick={handleGenerateArchitecture}
                                disabled={isGenerating}
                            >
                                {isGenerating ? '🔍 분석 및 생성 중...' : (mermaidCode ? '🔄 다시 그리기' : '✨ 청사진 생성하기')}
                            </button>
                        </div>

                        {mermaidCode ? (
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', padding: '10px', background: 'white' }}>
                                <MermaidRenderer chart={mermaidCode} />
                            </div>
                        ) : (
                            <div style={{
                                padding: '60px',
                                textAlign: 'center',
                                background: 'var(--bg-glass)',
                                borderRadius: '12px',
                                border: '1px dashed var(--border-color)'
                            }}>
                                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '20px', opacity: 0.5 }}>🗺️</span>
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    아직 생성된 청사진이 없습니다.<br />
                                    먼저 '목록' 탭에서 기능을 등록한 후, 청사진을 생성해보세요.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>{editingId ? '기능 수정' : '새 기능 등록'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>기능 이름</label>
                                <input
                                    className={styles.input}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="예: 구글 캘린더 연동"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>파일명</label>
                                <input
                                    className={styles.input}
                                    value={formData.fileName}
                                    onChange={e => setFormData({ ...formData, fileName: e.target.value })}
                                    placeholder="예: calendar_sync.gs, 자동발주.gs"
                                />
                            </div>
                            {/* ... Rest of form ... */}
                            <div className={styles.formGroup}>
                                <label className={styles.label}>상태</label>
                                <select
                                    className={styles.select}
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                    <option value="planned">계획됨 (Planned)</option>
                                    <option value="in-progress">개발중 (In Progress)</option>
                                    <option value="completed">완료 (Completed)</option>
                                    <option value="maintenance">유지보수 (Maintenance)</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>설명</label>
                                <textarea
                                    className={styles.textarea}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="이 프로젝트에 대한 설명..."
                                />
                            </div>

                            {/* Spreadsheet Info */}
                            <div className={styles.formGroup} style={{ marginTop: '10px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <label className={styles.label} style={{ color: '#4CAF50', marginBottom: '12px', display: 'block' }}>📊 스프레드시트 정보</label>

                                <div style={{ marginBottom: '10px' }}>
                                    <label className={styles.label} style={{ fontSize: '0.8rem' }}>시트 이름 (콤마 구분)</label>
                                    <input
                                        className={styles.input}
                                        value={formData.sheetNames}
                                        onChange={e => setFormData({ ...formData, sheetNames: e.target.value })}
                                        placeholder="예: 매입현황, 재고, 이력"
                                    />
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label className={styles.label} style={{ fontSize: '0.8rem' }}>주요 함수 (한 줄에 하나씩 - 함수명: 설명)</label>
                                    <textarea
                                        className={styles.textarea}
                                        value={formData.keyFunctions}
                                        onChange={e => setFormData({ ...formData, keyFunctions: e.target.value })}
                                        placeholder="onEdit: 셀 수정 시 자동 업데이트&#10;sendEmail: 매일 리포트 발송&#10;getData: 데이터 조회"
                                        rows={4}
                                    />
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label className={styles.label} style={{ fontSize: '0.8rem' }}>트리거 정보</label>
                                    <textarea
                                        className={styles.textarea}
                                        value={formData.triggerInfo}
                                        onChange={e => setFormData({ ...formData, triggerInfo: e.target.value })}
                                        placeholder="예: 매일 오전 9시 sendEmail 실행&#10;시트 편집 시 onEdit 트리거&#10;폼 제출 시 onFormSubmit 트리거"
                                        rows={3}
                                    />
                                </div>

                                <div style={{ marginTop: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', color: formData.emailNotification ? '#4CAF50' : '#888' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.emailNotification}
                                            onChange={e => setFormData({ ...formData, emailNotification: e.target.checked })}
                                            style={{ accentColor: '#4CAF50' }}
                                        />
                                        📧 메일 발송 여부
                                    </label>
                                </div>
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelBtn} onClick={handleCloseModal}>취소</button>
                                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                                    {isSubmitting ? '저장 중...' : '저장'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
