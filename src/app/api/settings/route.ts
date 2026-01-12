import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        const db = await getDatabase();
        const collection = db.collection('user_settings');

        const settings = await collection.findOne({ userId });

        if (!settings) {
            // Return defaults if no settings found
            return NextResponse.json({});
        }

        return NextResponse.json(settings.subMenus || {});

    } catch (error: any) {
        console.error('Settings GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        const { subMenus } = await request.json();

        const db = await getDatabase();
        const collection = db.collection('user_settings');

        await collection.updateOne(
            { userId },
            {
                $set: {
                    userId,
                    subMenus,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Settings POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
