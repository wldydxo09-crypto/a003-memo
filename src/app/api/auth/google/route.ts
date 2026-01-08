import { NextRequest, NextResponse } from 'next/server';
import { getOAuthClient, getAuthUrl } from '@/lib/googleAuth';

export async function GET(request: NextRequest) {
    try {
        const oAuth2Client = getOAuthClient();
        if (!oAuth2Client) {
            return NextResponse.json(
                { error: 'Google Client ID/Secret 설정이 필요합니다.' },
                { status: 500 }
            );
        }

        const url = getAuthUrl(oAuth2Client);
        return NextResponse.redirect(url); // Redirect user to Google Login

    } catch (error: any) {
        console.error('OAuth Login Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
