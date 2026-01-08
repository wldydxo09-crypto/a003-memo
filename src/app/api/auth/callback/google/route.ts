import { NextRequest, NextResponse } from 'next/server';
import { getOAuthClient } from '@/lib/googleAuth';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json({ error: '인증 코드가 없습니다.' }, { status: 400 });
        }

        const oAuth2Client = getOAuthClient();
        if (!oAuth2Client) {
            return NextResponse.json({ error: 'OAuth 클라이언트 설정 오류' }, { status: 500 });
        }

        // Exchange code for tokens
        const { tokens } = await oAuth2Client.getToken(code);

        // redirect response 생성
        const response = NextResponse.redirect(new URL('/', request.url));

        // Save tokens using response.cookies
        response.cookies.set('google_access_token', tokens.access_token || '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 3600 // 1 hour
        });

        if (tokens.refresh_token) {
            response.cookies.set('google_refresh_token', tokens.refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                maxAge: 60 * 60 * 24 * 30 // 30 days
            });
        }

        return response;

    } catch (error: any) {
        console.error('OAuth Callback Error:', error);
        return NextResponse.json({ error: '인증 실패: ' + error.message }, { status: 500 });
    }
}
