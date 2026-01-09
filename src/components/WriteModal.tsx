import { useState, useRef, useEffect } from 'react';
import { HistoryItem, LabelType, addHistoryItem, checkDuplicateHistory } from '@/lib/firebaseService';
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
    const [isUrgent, setIsUrgent] = useState(false);

    // Calendar State
    const [saveToCalendar, setSaveToCalendar] = useState(false);
    const [isAllDay, setIsAllDay] = useState(false);
    const [manualDate, setManualDate] = useState({
        startDate: '',
        startTime: '09:00',
        endDate: '',
        endTime: '10:00'
    });
    const [aiSchedule, setAiSchedule] = useState<{ title: string, start: string, end: string, location: string } | null>(null);

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

    const labels = [
        { id: 'issue', name: '문제', color: 'danger' },
        { id: 'idea', name: '아이디어', color: 'primary' },
        { id: 'update', name: '업데이트', color: 'success' },
        // { id: 'general', name: '일반', color: 'warning' }, // Deleted as requested
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
            setIsUrgent(false);
            setSaveToCalendar(false);
            setManualDate({
                startDate: new Date().toISOString().split('T')[0],
                startTime: '09:00',
                endDate: new Date().toISOString().split('T')[0],
                endTime: '10:00'
            });
            setAiSchedule(null);
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

    // Auto-detect submenu based on keyword match
    const detectSubMenu = (text: string): string | null => {
        const lowerText = text.toLowerCase();
        const savedSettings = localStorage.getItem('smartWork_subMenus');
        const subMenus = savedSettings ? JSON.parse(savedSettings) : {};
        const menuTags = subMenus[menuId] || [];

        // Find the first matching keyword and use it as the submenu ID
        for (const tag of menuTags) {
            if (lowerText.includes(tag.toLowerCase())) {
                return tag; // Return the matching keyword as subMenuId
            }
        }
        return null;
    };

    const handleAiSummary = async () => {
        if (!content.trim()) return;
        setIsAiLoading(true);
        try {
            const savedKey = localStorage.getItem('smartWork_geminiKey');
            const res = await fetch('/api/ai/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: content, type: 'schedule', apiKey: savedKey })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'AI Error');

            setSummary(data.summary);

            // Auto Schedule Detection (Store it, don't create yet)
            if (data.schedule) {
                console.log('Detected Schedule:', data.schedule);
                setAiSchedule(data.schedule);
                setSaveToCalendar(true); // Auto-enable checkbox if AI detects schedule

                // Pre-fill manual inputs with AI detected time
                const aiStart = new Date(data.schedule.start);
                const aiEnd = new Date(data.schedule.end);

                // Check if date is valid
                if (!isNaN(aiStart.getTime())) {
                    setManualDate({
                        startDate: aiStart.toISOString().split('T')[0],
                        startTime: aiStart.toTimeString().slice(0, 5),
                        endDate: aiEnd.toISOString().split('T')[0],
                        endTime: aiEnd.toTimeString().slice(0, 5)
                    });
                }

                alert(`🤖 AI가 일정을 감지했습니다!\n[${data.schedule.title}]\n\n'캘린더에 추가' 항목을 확인해주세요.`);
            }

            // Auto Label Logic
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
                alert('⚠️ AI 사용량이 초과되었습니다. (요약 건너뜀)');
            } else {
                alert(`AI 분석 실패: ${errorMsg}`);
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

                if (!confirm(`⚠️ 유사한 기록이 ${dupDate}에 있습니다.\n\n"${snippet}"\n\n저장하시겠습니까?`)) {
                    setIsSubmitting(false);
                    return;
                }
            }

            let calendarEventId = undefined;

            // Calendar Logic
            if (saveToCalendar) {
                try {
                    // Use Manual Data or Fallback
                    const startDateTime = `${manualDate.startDate}T${manualDate.startTime}:00`;
                    const endDateTime = `${manualDate.endDate}T${manualDate.endTime}:00`;

                    // Simple Validation
                    if (!manualDate.startDate || !manualDate.endDate) {
                        throw new Error('날짜를 선택해주세요.');
                    }

                    const calRes = await fetch('/api/calendar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            summary: aiSchedule?.title || summary || '새로운 일정',
                            description: `[메모] ${content}`,
                            startDateTime: startDateTime,
                            endDateTime: endDateTime,
                            location: aiSchedule?.location || null
                        })
                    });

                    const calData = await calRes.json();
                    if (calData.success) {
                        calendarEventId = calData.id;
                        // alert('📅 캘린더에 일정이 추가되었습니다.'); // Reduced alert noise
                    } else {
                        if (calData.needAuth) {
                            if (confirm('구글 캘린더 연동이 필요합니다. 연동하시겠습니까?')) {
                                window.open('/api/auth/google', '_blank');
                            }
                        } else {
                            console.error(`Calendar save failed: ${calData.error}`);
                        }
                    }
                } catch (calError: any) {
                    console.error("Calendar Sync Error", calError);
                    // alert(`캘린더 오류: ${calError.message}`); // Reduced alert noise
                }
            }

            // Image Upload to Google Drive
            let imageUrls: string[] = [];
            if (images.length > 0) {
                try {
                    console.log('Starting Google Drive upload...', images.length);

                    const uploadPromises = images.map(async (file) => {
                        const formData = new FormData();
                        formData.append('file', file);

                        const response = await fetch('/api/drive/upload', {
                            method: 'POST',
                            body: formData
                        });

                        const data = await response.json();

                        if (!data.success) {
                            if (data.needAuth) {
                                throw new Error('NEED_AUTH');
                            }
                            throw new Error(data.error || '업로드 실패');
                        }

                        return data.url;
                    });

                    // Set timeout for entire batch
                    const timeout = new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Upload timed out (30s)')), 30000)
                    );

                    imageUrls = await Promise.race([
                        Promise.all(uploadPromises),
                        timeout
                    ]);

                    console.log('Google Drive upload success:', imageUrls);
                } catch (uploadError: any) {
                    console.error('Image upload failed:', uploadError);

                    if (uploadError.message === 'NEED_AUTH') {
                        if (confirm('Google Drive 연동이 필요합니다. 연동하시겠습니까?')) {
                            window.open('/api/auth/google', '_blank');
                        }
                        // Still save text without images
                    } else {
                        alert(`이미지 업로드 실패: ${uploadError.message}\n\n텍스트만 저장됩니다.`);
                    }
                }
            }

            // Auto-detect tags one last time before saving (in case AI was skipped)
            const detectedTags = detectTags(content + ' ' + (summary || ''), selectedLabels);
            const finalLabels = [...new Set([...selectedLabels, ...detectedTags])] as any[];

            // Detect submenu based on content keywords
            const detectedSubMenu = detectSubMenu(content);

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
                calendarEventId,
                subMenuId: detectedSubMenu,
            });

            onClose();
            // Reset fields
            setContent('');
            setImages([]);
            setSummary('');
            setSelectedLabels([]);
        } catch (error: any) {
            console.error('Registration failed:', error);
            alert(`등록 실패: ${error.message}`);
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
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.titleArea}>
                        <div className={styles.title}>새 기록 작성</div>
                    </div>
                </div>

                <div className={styles.content}>
                    {/* 1. Category Selector - First Row */}
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

                    {/* 2. Labels + Options Row - Second Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                        {/* Labels */}
                        {labels.map(label => (
                            <button
                                key={label.id}
                                onClick={() => toggleLabel(label.id)}
                                className={`${styles.categoryBtn} ${selectedLabels.includes(label.id) ? styles.active : ''}`}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '0.8rem',
                                    background: selectedLabels.includes(label.id)
                                        ? (label.color === 'danger' ? '#ff4444' : label.color === 'success' ? '#00C851' : '#33b5e5')
                                        : 'transparent',
                                    borderColor: label.color === 'danger' ? '#ff4444' : label.color === 'success' ? '#00C851' : '#33b5e5',
                                    color: selectedLabels.includes(label.id) ? 'white' : (label.color === 'danger' ? '#ff4444' : label.color === 'success' ? '#00C851' : '#33b5e5')
                                }}
                            >
                                {label.name}
                            </button>
                        ))}

                        {/* Divider */}
                        <span style={{ color: '#444', margin: '0 4px' }}>|</span>

                        {/* Urgency Checkbox */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: isUrgent ? '#ff6b6b' : '#888', cursor: 'pointer', fontWeight: isUrgent ? 600 : 400 }}>
                            <input
                                type="checkbox"
                                checked={isUrgent}
                                onChange={(e) => setIsUrgent(e.target.checked)}
                                style={{ accentColor: '#ff6b6b' }}
                            />
                            🔥 긴급
                        </label>

                        {/* Calendar Checkbox */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: saveToCalendar ? 'var(--primary)' : '#888', cursor: 'pointer', fontWeight: saveToCalendar ? 600 : 400 }}>
                            <input
                                type="checkbox"
                                checked={saveToCalendar}
                                onChange={(e) => setSaveToCalendar(e.target.checked)}
                                style={{ accentColor: 'var(--primary)' }}
                            />
                            📅 일정 추가
                        </label>

                        {/* Template Toggle - Moved Here */}
                        <button
                            onClick={() => setShowTemplates(!showTemplates)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: showTemplates ? 'var(--primary)' : '#888',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                fontWeight: showTemplates ? 600 : 400
                            }}
                        >
                            📋 양식
                        </button>
                    </div>

                    {/* 3. Calendar Date Picker (Conditional) */}
                    {saveToCalendar && (
                        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            {/* All Day Toggle */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#888', cursor: 'pointer', marginBottom: '10px' }}>
                                <input
                                    type="checkbox"
                                    checked={isAllDay}
                                    onChange={(e) => setIsAllDay(e.target.checked)}
                                />
                                종일
                            </label>

                            <div style={{ display: 'grid', gridTemplateColumns: isAllDay ? '1fr' : '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#666' }}>시작</label>
                                    <input
                                        type="date"
                                        value={manualDate.startDate}
                                        onChange={(e) => setManualDate({ ...manualDate, startDate: e.target.value })}
                                        className={styles.summaryInput}
                                        style={{ marginTop: '4px' }}
                                    />
                                    {!isAllDay && (
                                        <input
                                            type="time"
                                            value={manualDate.startTime}
                                            onChange={(e) => setManualDate({ ...manualDate, startTime: e.target.value })}
                                            className={styles.summaryInput}
                                            style={{ marginTop: '4px' }}
                                        />
                                    )}
                                </div>
                                {!isAllDay && (
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#666' }}>종료</label>
                                        <input
                                            type="date"
                                            value={manualDate.endDate}
                                            onChange={(e) => setManualDate({ ...manualDate, endDate: e.target.value })}
                                            className={styles.summaryInput}
                                            style={{ marginTop: '4px' }}
                                        />
                                        <input
                                            type="time"
                                            value={manualDate.endTime}
                                            onChange={(e) => setManualDate({ ...manualDate, endTime: e.target.value })}
                                            className={styles.summaryInput}
                                            style={{ marginTop: '4px' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Template List (Collapsible) */}
                    {showTemplates && (
                        <div style={{
                            background: 'var(--bg-tertiary)',
                            borderRadius: '8px',
                            padding: '10px',
                            marginTop: '8px',
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

                    {/* 5. Content Input */}
                    <div className={styles.inputGroup} style={{ marginTop: '12px' }}>
                        <textarea
                            className={styles.textarea}
                            placeholder="내용을 입력하세요..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onPaste={handlePaste}
                            style={{ minHeight: summary ? '100px' : '150px' }}
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

                    {/* AI Summary (Conditional) */}
                    {summary && (
                        <div style={{ marginTop: '8px' }}>
                            <input
                                type="text"
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                className={styles.summaryInput}
                                placeholder="AI 요약"
                            />
                        </div>
                    )}

                    {/* Image Preview */}
                    {previews.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                            {previews.map((src, idx) => (
                                <div key={idx} style={{ position: 'relative', width: '50px', height: '50px' }}>
                                    <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                                    <button
                                        onClick={() => removeImage(idx)}
                                        style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', border: 'none', width: '18px', height: '18px', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 6. Image Upload Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ marginTop: '10px', background: 'transparent', border: '1px dashed #555', padding: '8px', width: '100%', borderRadius: '6px', color: '#777', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                        📷 이미지 첨부
                    </button>
                    <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
                </div>

                {/* Footer (Restored) */}
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
