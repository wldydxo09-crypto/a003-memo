import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
    try {
        const db = await getDatabase();

        const oldUserId = "dbobQKqFS9hcUSCHkkenyFdaaQB3";
        const newUserId = "696452ae01251ca9866c4d5e"; // wldydxo09@gmail.com

        // 1. Update History
        const historyRes = await db.collection('history').updateMany(
            { userId: oldUserId },
            { $set: { userId: newUserId } }
        );

        // 2. Update Features
        const featuresRes = await db.collection('features').updateMany(
            { userId: oldUserId },
            { $set: { userId: newUserId } }
        );

        // 3. Update Settings (If stored as document with userId field)
        // Check structure first. Usually settings might be keyed by _id = userId or have userId field.
        // Let's assume userId field for safety in updateMany, or try to rename _id if needed.
        // Based on previous code, UserSettings was distinct collection. 
        // Let's safe-update "user_settings" if it uses userId field.
        // If it uses _id, we need to insert new and delete old.

        const oldSettings = await db.collection('user_settings').findOne({ userId: oldUserId });
        let settingsMsg = "No settings found";

        if (oldSettings) {
            await db.collection('user_settings').updateOne(
                { _id: oldSettings._id },
                { $set: { userId: newUserId } }
            );
            settingsMsg = "Settings updated";
        } else {
            // Try finding by _id if checking fails
            const oldSettingsById = await db.collection('user_settings').findOne({ _id: oldUserId as any });
            if (oldSettingsById) {
                // Insert new with new ID
                await db.collection('user_settings').insertOne({
                    ...oldSettingsById,
                    _id: newUserId as any,
                    userId: newUserId
                });
                // Delete old
                await db.collection('user_settings').deleteOne({ _id: oldUserId as any });
                settingsMsg = "Settings migrated (ID change)";
            }
        }

        return NextResponse.json({
            success: true,
            history: `${historyRes.matchedCount} items found, ${historyRes.modifiedCount} updated`,
            features: `${featuresRes.matchedCount} items found, ${featuresRes.modifiedCount} updated`,
            settings: settingsMsg
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
