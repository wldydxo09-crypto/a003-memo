import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        console.log(`[API/history] GET request. UserId: ${userId}`);

        const status = searchParams.get('status');
        const menuId = searchParams.get('menuId');
        const label = searchParams.get('label');
        const subMenuId = searchParams.get('subMenuId');

        if (!userId) {
            return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
        }

        const db = await getDatabase();
        const collection = db.collection('history');

        let query: any = { userId };

        if (status && status !== 'all') {
            query.status = status;
        }
        if (menuId) {
            query.menuId = menuId;
        }
        if (label) {
            query.labels = label;
        }
        if (subMenuId) {
            query.subMenuId = subMenuId;
        }

        // Sort by createdAt desc
        const items = await collection.find(query)
            .sort({ createdAt: -1 })
            .toArray();

        // Helper to normalize Firestore-style timestamps
        const normalizeDate = (val: any) => {
            if (!val) return null;
            if (val.seconds !== undefined) return new Date(val.seconds * 1000).toISOString();
            if (val instanceof Date) return val.toISOString();
            return val; // Already a string or other format
        };

        // Convert _id to string id for frontend compatibility
        const formattedItems = items.map(item => ({
            ...item,
            id: item.id || item._id.toString(),
            _id: item._id.toString(),
            createdAt: normalizeDate(item.createdAt),
            updatedAt: normalizeDate(item.updatedAt),
            completedAt: normalizeDate(item.completedAt)
        }));

        return NextResponse.json(formattedItems);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, ...itemData } = body;

        if (!userId) {
            return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
        }

        const db = await getDatabase();
        const collection = db.collection('history');

        // Create new item
        const newItem = {
            ...itemData,
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            // Ensure status defaults if missing
            status: itemData.status || 'pending',
            labels: itemData.labels || []
        };

        const result = await collection.insertOne(newItem);

        return NextResponse.json({
            success: true,
            id: result.insertedId.toString(),
            ...newItem
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
