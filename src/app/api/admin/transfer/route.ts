import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const oldUserId = searchParams.get('oldId');
        const newUserId = searchParams.get('newId');

        if (!oldUserId || !newUserId) {
            return NextResponse.json({
                success: false,
                error: 'Missing parameters. Usage: /api/admin/transfer?oldId=OLD_ID&newId=NEW_ID'
            });
        }

        const db = await getDatabase();

        // 1. Transfer History
        const historyResult = await db.collection('history').updateMany(
            { userId: oldUserId },
            { $set: { userId: newUserId } }
        );

        // 2. Transfer Features (Inventory)
        const featuresResult = await db.collection('features').updateMany(
            { userId: oldUserId },
            { $set: { userId: newUserId } }
        );

        // 3. Transfer Settings (if any)
        const settingsResult = await db.collection('user_settings').updateMany(
            { userId: oldUserId },
            { $set: { userId: newUserId } }
        );

        return NextResponse.json({
            success: true,
            message: `Migration Complete.`,
            details: {
                history: historyResult.modifiedCount,
                features: featuresResult.modifiedCount,
                settings: settingsResult.modifiedCount
            }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
