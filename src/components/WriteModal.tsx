import { useState, useRef, useEffect } from 'react';
import { HistoryItem, LabelType, addHistoryItem, uploadImages, checkDuplicateHistory } from '@/lib/firebaseService';
import { MENUS } from '@/lib/menus';
import styles from './WriteModal.module.css';

interface WriteModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    initialMenuId?: string;
}



export default function WriteModal({ isOpen, onClose, userId, initialMenuId = 'work' }: WriteModalProps) {
    const [menuId, setMenuId] = useState(initialMenuId);
    const [content, setContent] = useState('');
    const [summary, setSummary] = useState('');
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isUrgent, setIsUrgent] = useState(false); // New state
    const [saveToCalendar, setSaveToCalendar] = useState(false);

    // Templates
    const [showTemplates, setShowTemplates] = useState(false);
    const [templates, setTemplates] = useState<{ id: string, name: string, content: string }[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('my_templates');
        if (saved) {
            setTemplates(JSON.parse(saved));
        } else {
            // Default templates
            setTemplates([
                { id: 'daily', name: '일일 업무 보고', content: '- 금일 진행 사항:\n- 익일 계획:\n- 이슈 사항:' },
                { id: 'bug', name: '버그 리포트', content: '1. 발생 경로:\n2. 증상:\n3. 예상 원인:' },
            ]);
        }
    }, []);

    const saveTemplate = () => {
        if (!content.trim()) return alert('내용을 입력해주세요.');
        const name = prompt('양식 이름을 입력해주세요:');
        if (!name) return;

        const newTemplate = { id: Date.now().toString(), name, content };
        const updated = [...templates, newTemplate];
        setTemplates(updated);
        localStorage.setItem('my_templates', JSON.stringify(updated));
        alert('양식이 저장되었습니다.');
    };

    const deleteTemplate = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('양식을 삭제하시겠습니까?')) return;
        const updated = templates.filter(t => t.id !== id);
        setTemplates(updated);
        localStorage.setItem('my_templates', JSON.stringify(updated));
    };

    const loadTemplate = (templateContent: string) => {
        if (content && !confirm('현재 작성 중인 내용이 덮어씌워집니다. 계속하시겠습니까?')) return;
        setContent(templateContent);
        setShowTemplates(false);
    };

    // Labels logic
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    // ... (rest of code) ...

    // (Inside return JSX, above textarea)
    // We need to inject the template button row.

    const labels = [
        { id: 'issue', name: '문제', color: 'danger' },
        { id: 'idea', name: '아이디어', color: 'primary' },
        { id: 'update', name: '업데이트', color: 'success' },
        { id: 'general', name: '일반', color: 'warning' },
    ];

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setMenuId(initialMenuId);
            setContent('');
            setSummary('');
            setImages([]);
            setPreviews([]);
            setSelectedLabels([]);
            setIsUrgent(false); // Reset
        }
    }, [isOpen, initialMenuId]);

    // ESC to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setImages(prev => [...prev, ...files]);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => setPreviews(prev => [...prev, e.target?.result as string]);
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const toggleLabel = (labelId: string) => {
        setSelectedLabels(prev =>
            prev.includes(labelId) ? prev.filter(l => l !== labelId) : [...prev, labelId]
        );
    };



    const detectTags = (text: string, currentTags: string[]) => {
        const lowerText = text.toLowerCase();
        const savedSettings = localStorage.getItem('smartWork_subMenus');
        const subMenus = savedSettings ? JSON.parse(savedSettings) : {};
        const menuTags = subMenus[menuId] || []; // Check tags for CURRENT menu

        const detected: string[] = [];
        menuTags.forEach((tag: string) => {
            if (lowerText.includes(tag.toLowerCase()) && !currentTags.includes(tag)) {
                detected.push(tag);
            }
        });

        // Default Logic (Issue/Idea)
        if (!currentTags.includes('issue') && !detected.includes('issue') && (lowerText.includes('문제') || lowerText.includes('에러') || lowerText.includes('버그'))) {
            detected.push('issue');
        }
        if (!currentTags.includes('idea') && !detected.includes('idea') && (lowerText.includes('아이디어') || lowerText.includes('제안'))) {
            detected.push('idea');
        }
        return detected;
    };

    const handleAiSummary = async () => {
        if (!content.trim()) return;
        setIsAiLoading(true);
        try {
            // Updated to use Server API with 'schedule' type to detect dates
            const savedKey = localStorage.getItem('smartWork_geminiKey');
            const res = await fetch('/api/ai/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: content, type: 'schedule', apiKey: savedKey })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'AI Error');

            setSummary(data.summary);

            // 1. Auto Schedule Creation Logic
            if (data.schedule) {
                console.log('Detected Schedule:', data.schedule);
                const calRes = await fetch('/api/calendar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        summary: data.schedule.title,
                        description: `[AI 생성] 원본 메모: ${content}`,
                        startDateTime: data.schedule.start,
                        endDateTime: data.schedule.end,
                        location: data.schedule.location
                    })
                });

                if (calRes.ok) {
                    alert(`📅 캘린더에 일정이 추가되었습니다!\n\n[${data.schedule.title}]\n${new Date(data.schedule.start).toLocaleString()}`);
                } else {
                    const calData = await calRes.json();
                    if (calRes.status === 401 || calData.needAuth) {
                        if (confirm('구글 캘린더 연동이 필요합니다. 연동하시겠습니까?')) {
                            window.open('/api/auth/google', '_blank');
                        }
                    } else {
                        console.error('Calendar Create Error:', calData);
                    }
                }
            }

            // 2. Auto Label Logic
            const newTags = detectTags(content + ' ' + data.summary, selectedLabels);
            if (newTags.length > 0) {
                setSelectedLabels(prev => [...prev, ...newTags] as any[]);
            }

        } catch (error: any) {
            console.error('AI Error:', error);
            // Even if AI fails, try to detect tags from content
            const newTags = detectTags(content, selectedLabels);
            if (newTags.length > 0) {
                setSelectedLabels(prev => [...prev, ...newTags] as any[]);
            }
            const errorMsg = error.message || String(error);
            if (errorMsg.includes('429') || errorMsg.includes('Quota') || errorMsg.includes('Too Many Requests')) {
                alert('⚠️ AI 사용량이 일시적으로 초과되었습니다.\n\nAI 요약은 건너뛰지만, 내용은 정상적으로 저장할 수 있습니다.\n(태그 자동 분류는 자체 분석으로 시도했습니다)');
            } else {
                alert(`AI 분석 실패: ${errorMsg} (태그 자동 분류는 시도했습니다)`);
            }
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!content.trim()) {
            alert('내용을 입력해주세요.');
            return;
        }
        setIsSubmitting(true);

        try {
            // Check Duplicates
            const duplicates = await checkDuplicateHistory(userId, content);
            if (duplicates.length > 0) {
                const firstDup = duplicates[0];
                const dupDate = firstDup.createdAt?.toDate ? firstDup.createdAt.toDate().toLocaleDateString() : '최근';
                const snippet = firstDup.content.length > 50 ? firstDup.content.substring(0, 50) + '...' : firstDup.content;

                const confirmSave = confirm(
                    `⚠️ 유사한 기록이 ${dupDate}에 있습니다.\n\n[기존 내용]: "${snippet}"\n\n그래도 저장하시겠습니까?`
                );
                if (!confirmSave) {
                    setIsSubmitting(false);
                    return;
                }
            }

            let calendarEventId = undefined;

            // Calendar Sync Logic
            if (saveToCalendar) {
                try {
                    // 1. Extract Schedule Info using AI
                    const aiRes = await fetch('/api/ai/summary', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: content, type: 'schedule' })
                    });
                    const aiData = await aiRes.json();

                    if (aiData.schedule) {
                        // 2. Create Event
                        const calRes = await fetch('/api/calendar', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                summary: aiData.schedule.title || summary || '새로운 일정',
                                description: content,
                                startDateTime: aiData.schedule.start,
                                endDateTime: aiData.schedule.end,
                                location: aiData.schedule.location
                            })
                        });
                        const calData = await calRes.json();
                        if (calData.success) {
                            calendarEventId = calData.id;
                        } else {
                            if (calData.needAuth) {
                                alert('구글 캘린더 연동이 필요합니다. 로그인 상태를 확인해주세요.');
                            } else {
                                alert(`캘린더 저장 실패: ${calData.error}`);
                            }
                        }
                    } else {
                        // Check for specific API error
                        if (aiData.error) {
                            console.warn("AI API Error:", aiData.error);
                            if (String(aiData.error).includes('429') || String(aiData.error).includes('Quota')) {
                                alert('AI 사용량이 초과되어 캘린더 자동 추출이 불가능합니다. (기록만 저장됩니다)');
                            } else {
                                alert(`AI 오류로 캘린더에 저장하지 못했습니다: ${aiData.error} (기록만 저장됩니다)`);
                            }
                        } else {
                            alert('내용에서 날짜/시간 정보를 찾을 수 없어 캘린더에 저장하지 못했습니다. (기록만 저장됩니다)');
                        }
                    }
                } catch (calError: any) {
                    console.error("Calendar Sync Error", calError);
                    alert(`캘린더 연동 중 오류가 발생했습니다: ${calError.message}`);
                }
            }

            const imageUrls = await uploadImages(userId, images);

            // Auto-detect tags one last time before saving (in case AI was skipped)
            const detectedTags = detectTags(content + ' ' + (summary || ''), selectedLabels);
            const finalLabels = [...new Set([...selectedLabels, ...detectedTags])] as any[];

            await addHistoryItem({
                userId,
                menuId,
                menuName: MENUS.find(m => m.id === menuId)?.name || '기타',
                content,
                summary: summary || null,
                images: imageUrls,
                status: 'pending',
                labels: finalLabels,
                priority: isUrgent ? 'high' : 'normal',
                calendarEventId
            });

            onClose();
            // Reset fields
            setContent('');
            setImages([]);
            setSummary('');
            setSelectedLabels([]);
        } catch (error: any) {
            console.error('Registration failed:', error);
            alert(`등록에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        const pastedFiles: File[] = [];

        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                if (file) pastedFiles.push(file);
            }
        }

        if (pastedFiles.length > 0) {
            e.preventDefault();
            setImages(prev => [...prev, ...pastedFiles]);
            pastedFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => setPreviews(prev => [...prev, e.target?.result as string]);
                reader.readAsDataURL(file);
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div className={styles.titleArea}>
                        <div className={styles.title}>새 기록 작성</div>
                        <div className={styles.categorySelector}>
                            {MENUS.map(menu => (
                                <button
                                    key={menu.id}
                                    className={`${styles.categoryBtn} ${menuId === menu.id ? styles.active : ''}`}
                                    onClick={() => setMenuId(menu.id)}
                                >
                                    {menu.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div className={styles.content}>
                    {/* Template Controls */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', gap: '8px' }}>
                        <button
                            onClick={() => setShowTemplates(!showTemplates)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--primary-light)',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            📋 자주 쓰는 양식 {showTemplates ? '닫기' : '불러오기'}
                        </button>
                    </div>

                    {/* Template List (Collapsible) */}
                    {showTemplates && (
                        <div style={{
                            background: 'var(--bg-tertiary)',
                            borderRadius: '8px',
                            padding: '10px',
                            marginBottom: '10px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                {templates.map(t => (
                                    <div
                                        key={t.id}
                                        style={{
                                            background: 'var(--bg-primary)',
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            border: '1px solid var(--border-color)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => loadTemplate(t.content)}
                                    >
                                        <span>{t.name}</span>
                                        <button
                                            onClick={(e) => deleteTemplate(t.id, e)}
                                            style={{ border: 'none', background: 'transparent', color: '#ff4444', cursor: 'pointer', padding: 0 }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={saveTemplate}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    background: 'var(--primary)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                + 현재 입력 내용 양식으로 저장
                            </button>
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <textarea
                            className={styles.textarea}
                            placeholder="내용을 입력하세요... (이미지를 붙여넣으면 자동 첨부됩니다)"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onPaste={handlePaste}
                            style={{ minHeight: summary ? '100px' : '200px' }}
                        />

                        <button
                            type="button"
                            className={styles.aiBtn}
                            onClick={handleAiSummary}
                            disabled={isAiLoading}
                        >
                            {isAiLoading ? '✨ 분석 중...' : '✨ AI 요약'}
                        </button>
                    </div>

                    {/* Summary Field (Conditional) */}
                    {summary && (
                        <div style={{ marginTop: '10px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '4px', display: 'block' }}>✨ AI 요약</label>
                            <input
                                type="text"
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                className={styles.summaryInput}
                            />
                        </div>
                    )}

                    {/* Image Preview Grid */}
                    {previews.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                            {previews.map((src, idx) => (
                                <div key={idx} style={{ position: 'relative', width: '60px', height: '60px' }}>
                                    <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                                    <button
                                        onClick={() => removeImage(idx)}
                                        style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', border: 'none', width: '20px', height: '20px', cursor: 'pointer' }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {labels.map(label => (
                            <button
                                key={label.id}
                                onClick={() => toggleLabel(label.id)}
                                style={{
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    background: selectedLabels.includes(label.id) ? 'var(--bg-glass-hover)' : 'transparent',
                                    color: selectedLabels.includes(label.id) ? 'var(--primary)' : '#888',
                                    border: `1px solid ${selectedLabels.includes(label.id) ? 'var(--primary)' : '#444'}`,
                                }}
                            >
                                {label.name}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ marginTop: '15px', background: 'transparent', border: '1px dashed #666', padding: '10px', width: '100%', borderRadius: '8px', color: '#888', cursor: 'pointer' }}
                    >
                        📷 이미지 첨부
                    </button>
                    <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />

                    {/* Urgency Toggle */}
                    <div style={{ marginTop: '15px' }}>

                        <label className={styles.priorityLabel} style={{ marginTop: '5px' }}>
                            <input
                                type="checkbox"
                                checked={isUrgent}
                                onChange={(e) => setIsUrgent(e.target.checked)}
                            />
                            🔥 긴급 / 중요 (Priority)
                        </label>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose}>취소</button>
                    <button
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={!content.trim() || isSubmitting}
                    >
                        {isSubmitting ? '저장 중...' : '저장하기'}
                    </button>
                </div>
            </div>
        </div >
    );
}
