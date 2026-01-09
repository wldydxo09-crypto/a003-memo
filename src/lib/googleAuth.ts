import { google } from 'googleapis';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// This must match the authorized redirect URI in Google Console
// Robust Base URL detection
const getBaseUrl = () => {
    // 1. If explicit env var is set (Best practice)
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

    // 2. In Production (Vercel), default to the main domain if env var is missing
    // This prevents "preview URLs" from breaking Google Auth
    if (process.env.NODE_ENV === 'production') {
        return 'https://a003-memo.vercel.app';
    }

    // 3. Fallback for Local Development
    return 'http://localhost:3000';
};

const BASE_URL = getBaseUrl();
const REDIRECT_URI = `${BASE_URL}/api/auth/callback/google`;

export function getOAuthClient() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return null;
    }

    return new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
    );
}

export function getAuthUrl(oAuth2Client: any) {
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/drive.file', // Added for image upload
    ];

    return oAuth2Client.generateAuthUrl({
        access_type: 'offline', // Get refresh token
        scope: scopes,
        prompt: 'consent', // Force approval to ensure refresh token
    });
}

