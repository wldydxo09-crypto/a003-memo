
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const { features } = await req.json();

        if (!features || !Array.isArray(features)) {
            return NextResponse.json({ error: 'Invalid features data' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const prompt = `
        You are a Senior System Architect.
        Based on the following list of features/components in a software project, generate a **Mermaid.js** diagram code that visualizes the system architecture.

        SYSTEM FEATURES:
        ${JSON.stringify(features, null, 2)}

        INSTRUCTIONS:
        1. Create a "graph TD" (Flowchart) or "classDiagram" depending on what fits best. A Flowchart showing relationships is usually best.
        2. Group items by their 'type' (frontend, backend, database, external) using subgraphs if possible (for flowchart).
        3. Use the 'name' and 'techStack' to label nodes.
        4. Infer relationships based on descriptions (e.g., if Feature A mentions "Google Calendar", link it to the External Service).
        5. Return **ONLY** the raw Mermaid code. Do not wrap in markdown code blocks like \`\`\`mermaid. Just the code.
        6. Keep it simple and readable.

        Output Example:
        graph TD
          subgraph Frontend
            A[TaskInput]
            B[HistoryList]
          end
          subgraph Backend
            C[Firebase]
          end
          A --> C
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Cleanup markdown if present
        text = text.replace(/```mermaid/g, '').replace(/```/g, '').trim();

        return NextResponse.json({ mermaidCode: text });

    } catch (error) {
        console.error('Architecture Gen Error:', error);
        return NextResponse.json({ error: 'Failed to generate architecture' }, { status: 500 });
    }
}
