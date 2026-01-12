import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;
        const { content } = await request.json();

        if (!content) {
            return NextResponse.json({ isDuplicate: false });
        }

        const db = await getDatabase();
        const collection = db.collection('history');

        // Fetch last 50 items for this user
        const recentItems = await collection
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();

        const normalizedNew = content.trim().replace(/\s+/g, ' ').toLowerCase();

        const duplicates = recentItems.filter((item: any) => {
            const normalizedOld = (item.content || '').trim().replace(/\s+/g, ' ').toLowerCase();

            if (normalizedNew === normalizedOld) return true;
            if (normalizedNew.length > 20 && normalizedOld.includes(normalizedNew)) return true;
            if (normalizedOld.length > 20 && normalizedNew.includes(normalizedOld)) return true;
            return false;
        });

        return NextResponse.json({
            isDuplicate: duplicates.length > 0,
            duplicates: duplicates.map(d => ({ ...d, id: d._id.toString(), _id: undefined }))
        });

    } catch (error: any) {
        console.error('Check Duplicate Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
