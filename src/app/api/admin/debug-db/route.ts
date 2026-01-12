import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { auth } from '@/auth';

export async function GET() {
    try {
        const session = await auth();
        const currentUserId = session?.user?.id || 'not-logged-in';

        const db = await getDatabase();
        const historyCollection = db.collection('history');

        // distinct userIds
        const userIds = await historyCollection.distinct('userId');

        // count per user
        const stats = await Promise.all(userIds.map(async (uid) => {
            const count = await historyCollection.countDocuments({ userId: uid });
            return { userId: uid, count };
        }));

        return NextResponse.json({
            databaseName: db.databaseName, // Show current DB name
            currentUser: {
                id: currentUserId,
                email: session?.user?.email
            },
            existingDataOwners: stats
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
