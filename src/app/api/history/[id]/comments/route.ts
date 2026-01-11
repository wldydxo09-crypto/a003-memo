import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Params is a Promise in newer Next.js
) {
    try {
        const { id } = await params; // Await params to get id
        const { content, userId } = await request.json();

        if (!content || !userId) {
            return NextResponse.json(
                { success: false, error: 'Content and userId are required' },
                { status: 400 }
            );
        }

        const db = await getDatabase();
        const collection = db.collection('history');

        const newComment = {
            id: crypto.randomUUID(),
            content,
            userId,
            createdAt: new Date().toISOString()
        };

        const result = await collection.updateOne(
            { id: id }, // Match by custom string ID (not _id)
            {
                $push: { comments: newComment } as any
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { success: false, error: 'History item not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(newComment);

    } catch (error: any) {
        console.error('Failed to add comment:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
