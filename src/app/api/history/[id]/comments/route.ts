import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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
            { id: id },
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

// Edit comment
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { commentId, content } = await request.json();

        if (!commentId || !content) {
            return NextResponse.json(
                { success: false, error: 'commentId and content are required' },
                { status: 400 }
            );
        }

        const db = await getDatabase();
        const collection = db.collection('history');

        let query: any = { 'comments.id': commentId };

        if (ObjectId.isValid(id)) {
            query.$or = [
                { id: id },
                { _id: new ObjectId(id) }
            ];
        } else {
            query.id = id;
        }

        const result = await collection.updateOne(
            query,
            {
                $set: {
                    'comments.$.content': content,
                    'comments.$.updatedAt': new Date().toISOString()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { success: false, error: 'Comment not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, commentId, content });

    } catch (error: any) {
        console.error('Failed to update comment:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// Delete comment
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const commentId = searchParams.get('commentId');

        if (!commentId) {
            return NextResponse.json(
                { success: false, error: 'commentId is required' },
                { status: 400 }
            );
        }

        const db = await getDatabase();
        const collection = db.collection('history');

        let query: any = {};

        if (ObjectId.isValid(id)) {
            query.$or = [
                { id: id },
                { _id: new ObjectId(id) }
            ];
        } else {
            query.id = id;
        }

        const result = await collection.updateOne(
            query,
            {
                $pull: { comments: { id: commentId } } as any
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { success: false, error: 'History item not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, commentId });

    } catch (error: any) {
        console.error('Failed to delete comment:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

