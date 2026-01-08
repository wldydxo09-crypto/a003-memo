'use client';

import { signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import styles from './Login.module.css';

interface LoginProps {
    user: User | null;
    loading: boolean;
}

export default function Login({ user, loading }: LoginProps) {
    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingSpinner}></div>
                <p className={styles.loadingText}>로딩 중...</p>
            </div>
        );
    }

    if (user) {
        return null; // Show main app
    }

    return (
        <div className={styles.container}>
            <div className={styles.loginCard}>
                {/* Logo */}
                <div className={styles.logoSection}>
                    <span className={styles.logoIcon}>✨</span>
                    <h1 className={styles.title}>스마트 업무 비서</h1>
                    <p className={styles.subtitle}>
                        업무 중 떠오르는 아이디어를 빠르게 기록하고<br />
                        AI가 자동으로 정리해드립니다
                    </p>
                </div>

                {/* Features */}
                <div className={styles.features}>
                    <div className={styles.feature}>
                        <span className={styles.featureIcon}>📝</span>
                        <span>빠른 메모 기록</span>
                    </div>
                    <div className={styles.feature}>
                        <span className={styles.featureIcon}>🤖</span>
                        <span>AI 자동 요약</span>
                    </div>
                    <div className={styles.feature}>
                        <span className={styles.featureIcon}>📅</span>
                        <span>캘린더 연동</span>
                    </div>
                </div>

                {/* Login Button */}
                <button className={styles.googleBtn} onClick={handleGoogleLogin}>
                    <svg className={styles.googleIcon} viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Google로 시작하기</span>
                </button>

                <p className={styles.terms}>
                    로그인하면 <a href="#">이용약관</a> 및 <a href="#">개인정보처리방침</a>에 동의하게 됩니다.
                </p>
            </div>
        </div>
    );
}
