import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

// 1. GET: 데이터 조회 예시
export async function GET() {
    try {
        const db = await getDatabase(); // 'smartwork' 데이터베이스 연결
        const collection = db.collection('test_collection'); // 'test_collection' 컬렉션 선택

        // 모든 데이터 가져오기 (배열로 변환)
        const data = await collection.find({}).toArray();

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// 2. POST: 데이터 저장 예시
export async function POST(request: Request) {
    try {
        const body = await request.json(); // 프론트엔드에서 보낸 데이터 받기

        const db = await getDatabase();
        const collection = db.collection('test_collection');

        // 데이터 저장
        const result = await collection.insertOne({
            ...body,
            createdAt: new Date()
        });

        return NextResponse.json({
            success: true,
            message: '데이터 저장 성공!',
            id: result.insertedId
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
