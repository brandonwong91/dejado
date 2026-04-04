export const runtime = 'edge';

function getMeta(html: string, ...props: string[]): string | null {
  for (const prop of props) {
    const patterns = [
      new RegExp(
        `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,
        'i'
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`,
        'i'
      ),
      new RegExp(
        `<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`,
        'i'
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${prop}["']`,
        'i'
      )
    ];
    for (const pattern of patterns) {
      const m = html.match(pattern);
      if (m?.[1]) return decodeEntities(m[1].trim());
    }
  }
  return null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url || !/^https?:\/\//i.test(url)) {
    return Response.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Dejado/1.0) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml'
      },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow'
    });

    if (!res.ok) {
      return Response.json({ error: 'Fetch failed' }, { status: 502 });
    }

    // Only parse text/html
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      return Response.json({ error: 'Not HTML' }, { status: 422 });
    }

    // Read only the first 50KB — OG tags are always in <head>
    const reader = res.body?.getReader();
    let html = '';
    if (reader) {
      const decoder = new TextDecoder();
      while (html.length < 50_000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        // Stop once we've passed </head>
        if (/<\/head>/i.test(html)) break;
      }
      reader.cancel();
    }

    const title =
      getMeta(html, 'og:title') ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
      null;
    const description = getMeta(html, 'og:description', 'description');
    const image = getMeta(html, 'og:image', 'twitter:image');
    const siteName = getMeta(html, 'og:site_name');

    return Response.json(
      { title, description, image, siteName },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600'
        }
      }
    );
  } catch {
    return Response.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
