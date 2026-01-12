import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
    try {
        const db = await getDatabase();

        const oldUserId = "dbobQKqFS9hcUSCHkkenyFdaaQB3";
        const newUserId = "696452ae01251ca9866c4d5e";

        // Check 'users' collection for old ID
        const oldUserDoc = await db.collection('users').findOne({ userId: oldUserId });
        const oldUserDocById = await db.collection('users').findOne({ _id: oldUserId as any });

        // Check 'user_settings' collection for old ID
        const oldSettingsDoc = await db.collection('user_settings').findOne({ userId: oldUserId });
        const oldSettingsDocById = await db.collection('user_settings').findOne({ _id: oldUserId as any });

        return NextResponse.json({
            users_by_userId: oldUserDoc ? 'Found' : 'Not Found',
            users_by_id: oldUserDocById ? 'Found' : 'Not Found',
            user_settings_by_userId: oldSettingsDoc ? 'Found' : 'Not Found',
            user_settings_by_id: oldSettingsDocById ? 'Found' : 'Not Found',

            // If found in users, show keys
            found_settings_in_users: oldUserDoc?.settings ? Object.keys(oldUserDoc.settings) : null
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
