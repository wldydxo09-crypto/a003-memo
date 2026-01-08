'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
    chart: string;
}

export default function MermaidRenderer({ chart }: MermaidRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
        });
    }, []);

    useEffect(() => {
        const renderChart = async () => {
            if (!chart) return;
            setError(null);

            try {
                // Unique ID for each render to avoid conflicts
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

                // mermaid.render returns an object { svg: string } in v10+
                const { svg } = await mermaid.render(id, chart);
                setSvg(svg);
            } catch (err) {
                console.error('Mermaid Render Error:', err);
                setError('Failed to render diagram. Syntax might be invalid.');
            }
        };

        renderChart();
    }, [chart]);

    if (error) {
        return <div style={{ color: 'red', padding: '20px' }}>Error: {error}</div>;
    }

    if (!svg) {
        return <div style={{ padding: '20px' }}>Rendering...</div>;
    }

    return (
        <div
            ref={containerRef}
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{
                width: '100%',
                overflowX: 'auto',
                display: 'flex',
                justifyContent: 'center',
                padding: '20px',
                background: 'white',
                borderRadius: '8px'
            }}
        />
    );
}
