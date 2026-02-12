import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuthClient } from '@/lib/googleAuth';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { summary, description, startDateTime, endDateTime, location } = body;

        // 1. Get Token from Session
        const session = await auth();
        const accessToken = session?.accessToken;
        const refreshToken = session?.refreshToken;

        if (!accessToken && !refreshToken) {
            return NextResponse.json(
                { error: 'Calendar auth required', needAuth: true },
                { status: 401 }
            );
        }

        // 2. Setup OAuth Client
        const oAuth2Client = getOAuthClient();
        if (!oAuth2Client) {
            return NextResponse.json({ error: 'OAuth Config Error' }, { status: 500 });
        }

        oAuth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        // 3. Create Event
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

        let eventResource: any = {
            summary: summary || '새로운 일정',
            description: description || '스마트 비서가 생성한 일정입니다.',
            location: location,
        };

        if (body.start && body.end) {
            // Client provided explicit start/end (likely All-Day event with 'date')
            eventResource.start = body.start;
            eventResource.end = body.end;
        } else {
            // Default/Legacy behavior (Timed event with startDateTime)
            eventResource.start = {
                dateTime: startDateTime,
                timeZone: 'Asia/Seoul',
            };
            eventResource.end = {
                dateTime: endDateTime || startDateTime,
                timeZone: 'Asia/Seoul',
            };
        }

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: eventResource,
        });

        return NextResponse.json({
            success: true,
            link: response.data.htmlLink,
            id: response.data.id
        });

    } catch (error: any) {
        console.error('Calendar API Error:', error);
        const isAuthError = error.message?.includes('invalid_grant') || error.response?.data?.error === 'invalid_grant';

        return NextResponse.json(
            {
                error: error.message || 'Calendar API Error',
                needAuth: isAuthError
            },
            { status: isAuthError ? 401 : (error.response?.status || 500) }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const timeMin = searchParams.get('timeMin') || new Date().toISOString();
        const timeMax = searchParams.get('timeMax');

        console.log('Calendar GET Params:', { timeMin, timeMax });

        // 1. Get Token from Session
        const session = await auth();
        const accessToken = session?.accessToken;
        const refreshToken = session?.refreshToken;

        if (!accessToken && !refreshToken) {
            return NextResponse.json(
                { error: 'Calendar auth required', needAuth: true },
                { status: 401 }
            );
        }

        // 2. Setup OAuth Client
        const oAuth2Client = getOAuthClient();
        if (!oAuth2Client) {
            return NextResponse.json({ error: 'OAuth Config Error' }, { status: 500 });
        }

        oAuth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        // 3. List Events
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin,
            timeMax: timeMax || undefined,
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 50,
        });

        return NextResponse.json({
            success: true,
            events: response.data.items || []
        });

    } catch (error: any) {
        console.error('Calendar List Error:', error);
        const isAuthError = error.message?.includes('invalid_grant') || error.response?.data?.error === 'invalid_grant';
        return NextResponse.json(
            {
                error: error.message || 'Failed to fetch calendar events',
                needAuth: isAuthError
            },
            { status: isAuthError ? 401 : (error.response?.status || 500) }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json(
                { error: 'Missing eventId' },
                { status: 400 }
            );
        }

        // 1. Get Token from Session
        const session = await auth();
        const accessToken = session?.accessToken;
        const refreshToken = session?.refreshToken;

        if (!accessToken && !refreshToken) {
            return NextResponse.json(
                { error: 'Calendar auth required', needAuth: true },
                { status: 401 }
            );
        }

        // 2. Setup OAuth Client
        const oAuth2Client = getOAuthClient();
        if (!oAuth2Client) {
            return NextResponse.json({ error: 'OAuth Config Error' }, { status: 500 });
        }

        oAuth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Calendar Delete Error:', error);
        const isAuthError = error.message?.includes('invalid_grant') || error.response?.data?.error === 'invalid_grant';
        return NextResponse.json(
            {
                error: error.message || 'Delete failed',
                needAuth: isAuthError
            },
            { status: isAuthError ? 401 : (error.response?.status || 500) }
        );
    }
}
