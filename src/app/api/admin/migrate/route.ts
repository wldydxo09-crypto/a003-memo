import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function POST(request: Request) {
    try {
        const { historyItems, userSettings, features, userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
        }

        const db = await getDatabase();

        // 1. Migrate History Items
        if (historyItems && historyItems.length > 0) {
            const historyCollection = db.collection('history');

            // Transform items if necessary (e.g. convert string dates to Date objects if they aren't already)
            // But usually JSON transfer makes them strings.
            const operations = historyItems.map((item: any) => ({
                updateOne: {
                    filter: { id: item.id }, // Use existing ID as key to prevent duplicates
                    update: { $set: { ...item, userId } }, // Ensure userId is attached
                    upsert: true
                }
            }));

            if (operations.length > 0) {
                await historyCollection.bulkWrite(operations);
            }
        }

        // 2. Migrate User Settings
        if (userSettings) {
            const usersCollection = db.collection('users');
            await usersCollection.updateOne(
                { userId: userId },
                {
                    $set: {
                        settings: userSettings,
                        updatedAt: new Date()
                    }
                },
                { upsert: true }
            );
        }

        // 3. Migrate Features
        if (features && features.length > 0) {
            const featuresCollection = db.collection('features');
            const operations = features.map((item: any) => ({
                updateOne: {
                    filter: { id: item.id },
                    update: { $set: { ...item, userId } },
                    upsert: true
                }
            }));

            if (operations.length > 0) {
                await featuresCollection.bulkWrite(operations);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Migrated ${historyItems?.length || 0} history items, ${features?.length || 0} features, and settings.`
        });

    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
