import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Using Gemini 2.5 Flash for fast analysis
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function POST(request: NextRequest) {
    try {
        const { content } = await request.json();

        if (!content) {
            return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
        }

        const currentDateTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

        const prompt = `
        현재 시각: ${currentDateTime}
        
        사용자의 입력 텍스트를 분석해서 "일정(Schedule)"과 관련된 정보가 있는지 파악해줘.
        JSON 형식으로만 응답해줘. 설명은 필요 없어.
        
        입력: "${content}"
        
        응답 포맷:
        {
            "isSchedule": boolean, // 일정 관련 내용이면 true
            "summary": string, // 일정 제목 (예: 마케팅 회의)
            "startDateTime": string, // YYYY-MM-DDTHH:mm:ss 형식 (추정 불가능하면 null)
            "endDateTime": string, // YYYY-MM-DDTHH:mm:ss 형식 (기본 1시간으로 설정)
            "description": string, // 기타 세부 내용
            "location": string // 장소 정보 (없으면 null)
        }
        `;

        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2, // Low temp for structured output
                    responseMimeType: "application/json"
                }
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Gemini API Error');
        }

        let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        // Remove Markdown code blocks if present
        resultText = resultText.replace(/```json\n?|\n?```/g, '').trim();

        const parsedResult = JSON.parse(resultText);

        return NextResponse.json(parsedResult);

    } catch (error: any) {
        console.error('Intent Analysis Error:', error);
        return NextResponse.json(
            { error: `Analysis failed: ${error.message}` },
            { status: 500 }
        );
    }
}
