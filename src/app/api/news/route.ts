import { NextResponse } from 'next/server';
import { generateContent } from '@/lib/gemini';

// Simple In-Memory Cache (Global scope preserves data in Next.js lambda warm starts / dev server)
// Key: category, Value: { summary: string, timestamp: number }
let cachedSummaries: Record<string, { summary: string, timestamp: number }> = {};
const CACHE_DURATION = 60 * 60 * 1000; // 1 Hour

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'ALL'; // ALL, TECH, BUSINESS, SPORTS, ENTERTAINMENT

    let rssUrl = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko';

    const topicMap: Record<string, string> = {
        'TECH': 'TECHNOLOGY',
        'BUSINESS': 'BUSINESS',
        'ENTERTAINMENT': 'ENTERTAINMENT',
        // 'SPORTS' handled separately
    };

    if (category !== 'ALL') {
        if (category === 'SPORTS') {
            // Special requirement: Only Baseball and Basketball
            rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent('야구 OR 농구')}&hl=ko&gl=KR&ceid=KR:ko`;
        } else if (topicMap[category]) {
            rssUrl = `https://news.google.com/rss/headlines/section/topic/${topicMap[category]}?hl=ko&gl=KR&ceid=KR:ko`;
        } else {
            // Treat as search query
            rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(category)}&hl=ko&gl=KR&ceid=KR:ko`;
        }
    }

    try {
        const response = await fetch(rssUrl);
        const xmlText = await response.text();

        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title>(.*?)<\/title>/;
        const linkRegex = /<link>(.*?)<\/link>/;
        const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;

        let match;
        while ((match = itemRegex.exec(xmlText)) !== null) {
            const itemContent = match[1];
            const title = titleRegex.exec(itemContent)?.[1] || 'No Title';
            const link = linkRegex.exec(itemContent)?.[1] || '#';
            const pubDate = pubDateRegex.exec(itemContent)?.[1] || '';

            const cleanTitle = title.replace('<![CDATA[', '').replace(']]>', '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

            items.push({
                title: cleanTitle,
                link,
                pubDate,
                source: 'Google News'
            });

            if (items.length >= 5) break; // Limit to 5 items by user request
        }

        // AI Summary Logic Removed by User Request (Quota Issues)
        const summary = '';

        return NextResponse.json({ items, summary });

    } catch (error) {
        console.error('News fetch error:', error);
        return NextResponse.json({ items: [], summary: '', error: 'Failed to fetch news' }, { status: 500 });
    }
}
