import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

export async function generateContent(prompt: string): Promise<string> {
    if (!apiKey) {
        throw new Error('Gemini API Key is missing');
    }

    try {
        // Using gemini-2.0-flash (Latest stable model in 2026)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw error;
    }
}
