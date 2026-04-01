import {
  generateArticleAction,
  getGlobalTrendingTopicsAction
} from '@/features/articles/actions';
import { db } from '@/db';
import { interests } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Dynamic rendering to ensure it's not cached
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Optional security check for production crons
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new NextResponse('Unauthorized', { status: 401 });
  // }

  try {
    // Determine target user for interests (fallback to system)
    const [targetUser] = await db
      .select({ userId: interests.userId })
      .from(interests)
      .limit(1);
    const userId = targetUser?.userId || undefined;

    // Fetch Global Trends
    const trends = await getGlobalTrendingTopicsAction();
    const trendTopic = trends[Math.floor(Math.random() * trends.length)];

    // Launch both generations in parallel
    const [interestArticle, trendArticle] = await Promise.all([
      generateArticleAction(undefined, true, userId), // From interests (private)
      generateArticleAction(trendTopic, false) // From global trends (public)
    ]);

    return NextResponse.json({
      success: true,
      articles: {
        interest: interestArticle,
        trend: trendArticle
      }
    });
  } catch (error: any) {
    console.error('API Error generating dual articles:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate articles' },
      { status: 500 }
    );
  }
}
