'use client';

import { useState, useRef } from 'react';
import { addHistoryItem, uploadImages } from '@/lib/dataService';
import styles from './TaskInput.module.css';

interface TaskInputProps {
    userId: string;
    menuId: string;
    menuName: string;
}

export default function TaskInput({ userId, menuId, menuName }: TaskInputProps) {
    const [content, setContent] = useState('');
    const [sheetName, setSheetName] = useState('');
    const [triggerInfo, setTriggerInfo] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summary, setSummary] = useState('');
    const [scheduleData, setScheduleData] = useState<any>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const labels = [
        { id: 'issue', name: '문제', color: 'danger' },
        { id: 'idea', name: '아이디어', color: 'primary' },
        { id: 'update', name: '업데이트', color: 'success' },
        { id: 'general', name: '일반', color: 'warning' },
    ];

    const toggleLabel = (labelId: string) => {
        setSelectedLabels(prev =>
            prev.includes(labelId)
                ? prev.filter(l => l !== labelId)
                : [...prev, labelId]
        );
    };

    // Helper: Process and preview files
    const processFiles = (files: File[]) => {
        if (files.length === 0) return;

        setImages(prev => [...prev, ...files]);

        // Create previews
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviews(prev => [...prev, e.target?.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    // Handler: Input change
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        processFiles(files);
    };

    // Handler: Paste (Ctrl+V)
    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) files.push(file);
            }
        }

        if (files.length > 0) {
            e.preventDefault(); // Prevent binary output in textarea
            processFiles(files);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSummarize = async () => {
        if (!content.trim()) return;

        setIsSummarizing(true);
        setScheduleData(null);
        try {
            // 1. Get Summary
            const sumResponse = await fetch('/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });

            if (sumResponse.ok) {
                const data = await sumResponse.json();
                setSummary(data.summary);
            }

            // 2. Analyze Intent (Schedule)
            const analyzeResponse = await fetch('/api/analyze-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });

            if (analyzeResponse.ok) {
                const data = await analyzeResponse.json();
                if (data.isSchedule) {
                    setScheduleData(data);
                }
            }
        } catch (error) {
            console.error('AI Processing error:', error);
            alert('AI 처리에 실패했습니다.');
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleAddToCalendar = async () => {
        if (!scheduleData) return;

        try {
            const response = await fetch('/api/calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    summary: scheduleData.summary,
                    description: content,
                    startDateTime: scheduleData.startDateTime,
                    endDateTime: scheduleData.endDateTime,
                    location: scheduleData.location
                }),
            });

            const result = await response.json();

            if (response.ok) {
                alert('📅 캘린더에 일정이 등록되었습니다!');
                setScheduleData(null); // Clear after success
            } else if (result.needAuth) {
                if (confirm('구글 캘린더 연동이 필요합니다. 로그인 페이지로 이동할까요?')) {
                    window.location.href = '/api/auth/google';
                }
            } else {
                alert('등록 실패: ' + result.error);
            }

        } catch (error) {
            console.error('Calendar error:', error);
            alert('캘린더 등록 중 오류가 발생했습니다.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            // Upload images first
            let imageUrls: string[] = [];
            if (images.length > 0) {
                imageUrls = await uploadImages(userId, images);
            }

            // Add history item
            await addHistoryItem({
                userId,
                menuId,
                menuName,
                content: content.trim(),
                summary: summary || null,
                images: imageUrls,
                status: 'pending',
                labels: selectedLabels,
                sheetName: sheetName || null,
                emailSent,
                triggerInfo: triggerInfo || null,
            });

            // Reset form
            setContent('');
            setSheetName('');
            setTriggerInfo('');
            setEmailSent(false);
            setSelectedLabels([]);
            setImages([]);
            setPreviews([]);
            setSummary('');
            setScheduleData(null);

        } catch (error: any) {
            console.error('Submit error:', error);
            let errorMessage = '저장에 실패했습니다.';

            if (error.code === 'permission-denied' || error.message?.includes('permission-denied')) {
                errorMessage = '🚫 저장 권한이 없습니다.\nFirebase Console > Firestore Database > Rules 탭에서\nallow read, write: if true; 로 변경해주세요.';
            } else if (error.message) {
                errorMessage = `오류: ${error.message}`;
            }

            alert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getPlaceholder = () => {
        switch (menuId) {
            case 'dev': return '코드 스니펫이나 새로 배운 내용을 기록하세요...';
            case 'issue': return '에러 메시지를 붙여넣거나 발생한 문제를 설명하세요...';
            case 'idea': return '떠오른 영감을 자유롭게 적으세요...';
            case 'meeting': return '회의 안건이나 결정 사항을 입력하세요...';
            default: return '기록할 내용을 입력하세요... (대화 이력을 붙여넣을 수도 있습니다)';
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>새 기록 추가</h2>

                {/* Content Input */}
                <div className={styles.inputGroup}>
                    <label className={styles.label}>내용</label>
                    <textarea
                        className={styles.textarea}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onPaste={handlePaste}
                        placeholder={getPlaceholder()}
                        rows={5}
                    />
                    <button
                        type="button"
                        className={styles.summarizeBtn}
                        onClick={handleSummarize}
                        disabled={!content.trim() || isSummarizing}
                    >
                        {isSummarizing ? '분석 중...' : '🤖 AI 요약 & 분석'}
                    </button>
                </div>

                {/* AI Summary Display */}
                {summary && (
                    <div className={styles.summaryBox}>
                        <span className={styles.summaryLabel}>AI 요약</span>
                        <p className={styles.summaryText}>{summary}</p>

                        {/* Schedule Preview */}
                        {scheduleData && (
                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #eee' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span className={styles.summaryLabel} style={{ background: '#34A853', margin: 0 }}>📅 일정 감지</span>
                                    <strong style={{ fontSize: '0.95rem' }}>{scheduleData.summary}</strong>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px', paddingLeft: '4px' }}>
                                    {scheduleData.startDateTime?.replace('T', ' ')}
                                    {scheduleData.location && ` @ ${scheduleData.location}`}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddToCalendar}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#4285F4',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: 500
                                    }}
                                >
                                    구글 캘린더에 등록하기
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Labels */}
                <div className={styles.inputGroup}>
                    <label className={styles.label}>라벨</label>
                    <div className={styles.labelsGrid}>
                        {labels.map((label) => (
                            <button
                                key={label.id}
                                type="button"
                                className={`${styles.labelBtn} ${styles[label.color]} ${selectedLabels.includes(label.id) ? styles.selected : ''
                                    }`}
                                onClick={() => toggleLabel(label.id)}
                            >
                                {label.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Image Upload */}
                <div className={styles.inputGroup}>
                    <label className={styles.label}>이미지 첨부</label>
                    <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
                        <span className={styles.uploadIcon}>📷</span>
                        <span>클릭하여 이미지 추가 (또는 Ctrl+V로 붙여넣기)</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageSelect}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {previews.length > 0 && (
                        <div className={styles.previewGrid}>
                            {previews.map((preview, index) => (
                                <div key={index} className={styles.previewItem}>
                                    <img src={preview} alt={`Preview ${index + 1}`} />
                                    <button
                                        type="button"
                                        className={styles.removeBtn}
                                        onClick={() => removeImage(index)}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isSubmitting || !content.trim()}
                >
                    {isSubmitting ? '저장 중...' : '저장하기'}
                </button>
            </div>
        </form>
    );
}
