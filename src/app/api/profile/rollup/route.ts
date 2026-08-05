import { rollupAllProfilesAction } from '@/features/chat-profile/actions/rollup';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Nightly profile rollup. Idempotent per (userId, date) — running it twice in
 * one day updates the existing snapshot rather than creating a second one.
 */
export async function GET() {
  try {
    const result = await rollupAllProfilesAction();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
