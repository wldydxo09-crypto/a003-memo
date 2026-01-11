import { NextResponse } from 'next/server';
import clientPromise, { getDatabase } from '@/lib/mongodb';

export async function GET() {
    try {
        // Test MongoDB connection
        const client = await clientPromise;

        // Ping the database
        await client.db().command({ ping: 1 });

        // Get database info
        const db = await getDatabase('smartwork');
        const collections = await db.listCollections().toArray();

        return NextResponse.json({
            success: true,
            message: '✅ MongoDB 연결 성공!',
            database: 'smartwork',
            collections: collections.map(c => c.name),
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('MongoDB connection error:', error);
        return NextResponse.json({
            success: false,
            message: '❌ MongoDB 연결 실패',
            error: error.message
        }, { status: 500 });
    }
}
