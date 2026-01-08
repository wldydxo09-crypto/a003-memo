import { NextResponse } from 'next/server';

export async function GET() {
    // Replicate logic from lib/googleAuth.ts to see what it sees
    const getBaseUrl = () => {
        if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
        if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
        return 'http://localhost:3000';
    };

    const baseUrl = getBaseUrl();
    const redirectUri = `${baseUrl}/api/auth/callback/google`;

    return NextResponse.json({
        env_app_url: process.env.NEXT_PUBLIC_APP_URL,
        env_vercel_url: process.env.VERCEL_URL,
        calculated_base_url: baseUrl,
        calculated_redirect_uri: redirectUri,
        message: "Please ensure 'calculated_redirect_uri' exactly matches the URI in Google Cloud Console."
    });
}
