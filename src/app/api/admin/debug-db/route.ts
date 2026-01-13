import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
    try {
        const db = await getDatabase();

        // Basic connectivity check
        const historyCount = await db.collection('history').countDocuments();
        const usersCount = await db.collection('users').countDocuments();

        return NextResponse.json({
            status: 'ok',
            databaseName: db.databaseName,
            counts: {
                history: historyCount,
                users: usersCount
            },
            envVarDefined: !!process.env.MONGODB_URI
        });
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
