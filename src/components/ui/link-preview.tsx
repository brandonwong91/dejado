'use client';

import { useEffect, useState } from 'react';

type OGData = {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

// Module-level cache — persists across re-renders and navigation within the session
const ogCache = new Map<string, OGData | null>();

export function LinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<OGData | null | undefined>(
    ogCache.has(url) ? ogCache.get(url) : undefined
  );

  useEffect(() => {
    if (ogCache.has(url)) return;

    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d: OGData & { error?: string }) => {
        const result = d.error ? null : d;
        ogCache.set(url, result);
        setData(result);
      })
      .catch(() => {
        ogCache.set(url, null);
        setData(null);
      });
  }, [url]);

  // Loading
  if (data === undefined) {
    return (
      <div className='bg-muted mt-2 h-12 w-full animate-pulse rounded-lg' />
    );
  }

  // Nothing useful to show
  if (!data || (!data.image && !data.description)) return null;

  return (
    <a
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      className='bg-muted/40 hover:bg-muted/70 mt-2 flex min-w-0 gap-3 overflow-hidden rounded-lg border p-2 transition-colors'
      onClick={(e) => e.stopPropagation()}
    >
      {data.image && (
        <img
          src={data.image}
          alt=''
          className='size-14 shrink-0 rounded object-cover'
          referrerPolicy='no-referrer'
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <div className='min-w-0 space-y-0.5 py-0.5'>
        {data.siteName && (
          <p className='text-muted-foreground text-[10px] font-semibold tracking-wider uppercase'>
            {data.siteName}
          </p>
        )}
        {data.description && (
          <p className='text-muted-foreground line-clamp-2 text-xs leading-relaxed'>
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
}
