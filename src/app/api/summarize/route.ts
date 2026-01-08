import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Using gemini-1.5-flash - the most stable model for free tier
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export async function POST(request: NextRequest) {
    try {
        const { content } = await request.json();

        if (!content) {
            return NextResponse.json(
                { error: '내용이 필요합니다.' },
                { status: 400 }
            );
        }

        if (!GEMINI_API_KEY) {
            console.error('Error: GEMINI_API_KEY is missing.');
            return NextResponse.json(
                { error: 'Gemini API 키가 없습니다. .env.local을 확인하세요.' },
                { status: 500 }
            );
        }

        const prompt = `다음 업무 관련 내용을 간결하게 요약해주세요. 핵심 포인트와 필요한 조치 사항이 있다면 포함해주세요. 한국어로 작성해주세요.\n\n내용:\n${content}`;

        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 500,
                }
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error:', JSON.stringify(data, null, 2));
            return NextResponse.json(
                { error: `API 오류: ${data.error?.message || '알 수 없음'}` },
                { status: 500 }
            );
        }

        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || '요약 불가';
        return NextResponse.json({ summary });

    } catch (error: any) {
        console.error('Server Error:', error);
        return NextResponse.json(
            { error: `서버 오류: ${error.message}` },
            { status: 500 }
        );
    }
}
