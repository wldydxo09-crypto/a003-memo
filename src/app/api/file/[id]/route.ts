import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const id = params.id;

        const db = await getDatabase();
        const collection = db.collection('uploads');

        const fileDoc = await collection.findOne({ _id: new ObjectId(id) });

        if (!fileDoc) {
            return new NextResponse('File not found', { status: 404 });
        }

        // Return the file content
        // Note: fileDoc.data is a Binary type in MongoDB driver
        const buffer = fileDoc.data.buffer ? fileDoc.data.buffer : fileDoc.data;

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': fileDoc.contentType,
                'Content-Length': fileDoc.size.toString(),
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });

    } catch (error: any) {
        console.error('File Fetch Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
