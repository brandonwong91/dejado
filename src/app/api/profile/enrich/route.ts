import { enrichPendingMessagesAction } from '@/features/chat-profile/actions/enrich';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Tier 1 drain. Also invoked fire-and-forget from /api/chat, so this route is a
 * catch-up for anything that request missed rather than the primary path.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const batches = Math.min(
    10,
    Math.max(1, Number(url.searchParams.get('batches') ?? 1))
  );

  try {
    let processed = 0;
    let topics = 0;

    for (let i = 0; i < batches; i++) {
      const result = await enrichPendingMessagesAction();
      processed += result.processed;
      topics += result.topics;
      if (result.processed === 0) break;
    }

    return NextResponse.json({ ok: true, processed, topics });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
