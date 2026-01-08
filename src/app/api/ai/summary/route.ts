import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { text, type, apiKey: userApiKey } = body; // type: 'general' | 'schedule'

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Use User Key or Env Key
        const apiKey = userApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // Switching to gemini-pro to ensure availability
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        let prompt = '';

        if (type === 'schedule') {
            // Get KST Time
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const kstOffset = 9 * 60 * 60 * 1000;
            const kstDate = new Date(utc + kstOffset);

            const todayStr = kstDate.toISOString().split('T')[0];
            const timeStr = kstDate.toTimeString().split(' ')[0];
            const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][kstDate.getDay()];

            prompt = `
Context: 
- Current Date (KST): ${todayStr} (${dayOfWeek}요일)
- Current Time: ${timeStr}
Input: "${text}"

Task: 
1. Summarize the input into a concise "Summary" in Korean.
2. Extract schedule/event information for Google Calendar.
   - "내일" = Date after ${todayStr}.
   - "오늘" = ${todayStr}.
   - If time is mentioned (e.g. "10시"), convert to ISO format (YYYY-MM-DDTHH:mm:00). Assume 24h format or reasonable AM/PM (e.g. 10시 -> 10:00, 14시 -> 14:00).
   - Use the remaining text (e.g. "123", "Meeting") as the "title". If title is empty or just numbers, use it anyway (e.g. "123"). If absolutely no title, use "새로운 일정".
   
3. Return ONLY a JSON object:
{
  "summary": "Summary text",
  "schedule": {
    "title": "Event Title",
    "start": "YYYY-MM-DDTHH:mm:00",
    "end": "YYYY-MM-DDTHH:mm:00", 
    "location": "Location or null"
  }
}
If NO date/time is mentioned, set "schedule": null.
`;
        } else {
            prompt = `다음 내용을 3줄 이내로 핵심만 요약해줘. (어투: '~함', '~임'체):\n\n${text}`;
        }

        const resultRes = await model.generateContent(prompt);
        const result = resultRes.response.text();

        // Parse JSON if schedule
        if (type === 'schedule') {
            try {
                // Robust JSON extraction
                const firstBrace = result.indexOf('{');
                const lastBrace = result.lastIndexOf('}');

                if (firstBrace === -1 || lastBrace === -1) {
                    throw new Error('No JSON found');
                }

                const jsonStr = result.substring(firstBrace, lastBrace + 1);
                const data = JSON.parse(jsonStr);
                return NextResponse.json(data);
            } catch (e) {
                console.error("JSON Parse Error", e, "Result:", result);
                // Fallback: return summary as text, schedule null
                return NextResponse.json({ summary: result, schedule: null });
            }
        }

        return NextResponse.json({ summary: result });

    } catch (error: any) {
        console.error('AI API Error:', error);
        // Handle 429 specifically handled in gemini.ts?
        // generateContent throws error.
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
