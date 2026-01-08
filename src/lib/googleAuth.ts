import { google } from 'googleapis';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// This must match the authorized redirect URI in Google Console
const REDIRECT_URI = 'http://localhost:3000/api/auth/callback/google';

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
    ];

    return oAuth2Client.generateAuthUrl({
        access_type: 'offline', // Get refresh token
        scope: scopes,
        prompt: 'consent', // Force approval to ensure refresh token
    });
}
