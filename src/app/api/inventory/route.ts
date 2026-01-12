import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { auth } from '@/auth';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        const { searchParams } = new URL(request.url);
        // Optional filters if needed

        const db = await getDatabase();
        const collection = db.collection('features');

        const items = await collection.find({ userId }).sort({ createdAt: -1 }).toArray();

        // Convert _id to id
        const formattedItems = items.map(item => ({
            ...item,
            id: item._id.toString(),
            _id: undefined
        }));

        return NextResponse.json(formattedItems);

    } catch (error: any) {
        console.error('Inventory GET Error:', error);
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

        const body = await request.json();

        // Ensure userId matches session
        const newItem = {
            ...body,
            userId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const db = await getDatabase();
        const collection = db.collection('features');

        const result = await collection.insertOne(newItem);

        return NextResponse.json({
            success: true,
            id: result.insertedId.toString()
        });

    } catch (error: any) {
        console.error('Inventory POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
