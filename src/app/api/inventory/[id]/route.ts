import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { auth } from '@/auth';
import { ObjectId } from 'mongodb';

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> } // params is a Promise in recent Next.js
) {
    try {
        // Await the params object
        const params = await context.params;
        const id = params.id;

        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        const updates = await request.json();
        delete updates._id; // Prevent updating _id
        delete updates.userId; // Prevent changing owner

        const db = await getDatabase();
        const collection = db.collection('features');

        const result = await collection.updateOne(
            { _id: new ObjectId(id), userId }, // Ensure ownership
            {
                $set: {
                    ...updates,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Item not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Inventory PUT Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> } // params is a Promise
) {
    try {
        const params = await context.params;
        const id = params.id;

        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        const db = await getDatabase();
        const collection = db.collection('features');

        const result = await collection.deleteOne({
            _id: new ObjectId(id),
            userId
        });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Item not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Inventory DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
