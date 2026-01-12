import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
    try {
        const db = await getDatabase();

        const oldUserId = "dbobQKqFS9hcUSCHkkenyFdaaQB3";
        const newUserId = "696452ae01251ca9866c4d5e";

        // 1. Get settings from 'users' collection (Old ID)
        const oldUserDoc = await db.collection('users').findOne({ userId: oldUserId });

        if (!oldUserDoc || !oldUserDoc.settings) {
            return NextResponse.json({ success: false, message: 'Settings not found in users collection' });
        }

        const settingsData = oldUserDoc.settings;

        // 2. Save to 'user_settings' collection (New ID)
        await db.collection('user_settings').updateOne(
            { userId: newUserId },
            {
                $set: {
                    userId: newUserId,
                    subMenus: settingsData, // Map 'settings' to 'subMenus'
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );

        return NextResponse.json({
            success: true,
            message: `Recovered settings for ${Object.keys(settingsData).length} menus.`
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
