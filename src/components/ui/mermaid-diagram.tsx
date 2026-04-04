'use client';

import { useEffect, useId, useRef, useState } from 'react';

export function MermaidDiagram({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains('dark')
            ? 'dark'
            : 'default',
          fontFamily: 'inherit',
          fontSize: 14
        });

        const { svg } = await mermaid.render(`mermaid-${id}`, chart.trim());
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to render diagram');
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <pre className='bg-muted overflow-x-auto rounded-lg p-4 text-xs'>
        {chart}
      </pre>
    );
  }

  return (
    <div
      ref={ref}
      className='bg-muted/30 my-6 flex overflow-x-auto rounded-xl border p-4 [&>svg]:mx-auto [&>svg]:max-w-full'
    />
  );
}
