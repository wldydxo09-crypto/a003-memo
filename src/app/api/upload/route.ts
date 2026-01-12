import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { auth } from '@/auth';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const files = formData.getAll('file') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files found' }, { status: 400 });
        }

        const db = await getDatabase();
        const bucket = db.collection('uploads');

        const uploadedUrls: string[] = [];

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const result = await bucket.insertOne({
                filename: file.name,
                contentType: file.type,
                data: buffer,
                size: file.size,
                userId: session.user.id,
                uploadedAt: new Date()
            });

            // Return a URL that serves this file
            uploadedUrls.push(`/api/file/${result.insertedId.toString()}`);
        }

        return NextResponse.json({ urls: uploadedUrls });

    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
