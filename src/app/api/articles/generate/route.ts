import { generateArticleAction } from '@/features/articles/actions';
import { NextResponse } from 'next/server';

// Dynamic rendering to ensure it's not cached
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Check for some secret key in headers for security in production cron job
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new NextResponse('Unauthorized', { status: 401 });
  // }

  try {
    const article = await generateArticleAction();
    return NextResponse.json({ success: true, article });
  } catch (error: any) {
    console.error('API Error generating article:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate article' },
      { status: 500 }
    );
  }
}
