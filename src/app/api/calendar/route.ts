import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuthClient } from '@/lib/googleAuth';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
    try {
        const { summary, description, startDateTime, endDateTime, location } = await request.json();

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

        const event = {
            summary: summary || '새로운 일정',
            description: description || '스마트 비서가 생성한 일정입니다.',
            start: {
                dateTime: startDateTime, // ISO format: '2026-01-08T14:00:00'
                timeZone: 'Asia/Seoul',
            },
            end: {
                dateTime: endDateTime || startDateTime, // If same, technically 0 duration, but better to set +1 hour
                timeZone: 'Asia/Seoul',
            },
            location: location,
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        });

        return NextResponse.json({
            success: true,
            link: response.data.htmlLink,
            id: response.data.id
        });

    } catch (error: any) {
        console.error('Calendar API Error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
// ... POST method ...

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const timeMin = searchParams.get('timeMin') || new Date().toISOString();
        // Default to 1 month from now if not specified? Or let caller decide. 
        // We'll require timeMax or default to +1 month.
        const timeMax = searchParams.get('timeMax');

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
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
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
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
