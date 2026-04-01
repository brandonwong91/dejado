'use server';

import { db } from '@/db';
import { articles, listItems, interests } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { eq, desc, sql, and, or } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export interface ArticleData {
  title: string;
  topic?: string;
  summary?: string;
  content: string;
  imageUrl?: string;
}

export async function getArticlesAction() {
  const { userId } = await auth();

  if (!userId) {
    // Only return public articles for unauthenticated users
    return await db
      .select()
      .from(articles)
      .where(eq(articles.isPublic, 'true'))
      .orderBy(desc(articles.createdAt));
  }

  // Return public articles OR articles owned by the current user
  return await db
    .select()
    .from(articles)
    .where(or(eq(articles.isPublic, 'true'), eq(articles.userId, userId)))
    .orderBy(desc(articles.createdAt));
}

export async function getArticleAction(id: string) {
  const [article] = await db.select().from(articles).where(eq(articles.id, id));
  return article;
}

async function callPollinations(prompt: string, jsonMode = false, retries = 2) {
  // Use the standard chat completions endpoint
  const apiUrl = `https://gen.pollinations.ai/v1/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (process.env.POLLINATIONS_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
  }

  const body = {
    messages: [{ role: 'user', content: prompt }],
    model: 'openai',
    jsonMode: jsonMode,
    temperature: 0.8
  };

  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        // Add a timeout for each attempt
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Pollinations API attempt ${i + 1} failed with status:`,
          response.status
        );
        throw new Error(
          `Pollinations API returned ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      if (!content && i < retries) continue;
      return content;
    } catch (error: any) {
      console.error(`Fetch error for Pollinations (attempt ${i + 1}):`, error);
      if (i === retries) throw error;
      // Wait before retrying (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
  return '';
}

export async function generateArticleAction(
  customTopic?: string,
  forcePrivate = false
) {
  const { userId } = await auth();

  try {
    // 1. Choose a topic (either custom or trending)
    let topic = customTopic;
    if (!topic) {
      // Fetch some random managed interests first
      const managedInterests = await db
        .select({ name: interests.name })
        .from(interests)
        .where(eq(interests.userId, userId || ''))
        .orderBy(sql`RANDOM()`)
        .limit(5);

      // Also get some random list items for extra context
      const randomItems = await db
        .select({ title: listItems.title })
        .from(listItems)
        .orderBy(sql`RANDOM()`)
        .limit(5);

      const interestTitles = managedInterests.map((i) => i.name);
      const listTitles = randomItems.map((item) => item.title).filter(Boolean);

      const allInterests = [...interestTitles, ...listTitles].join(', ');

      let topicPrompt = `Suggest one highly trending topic in technology, science, or productivity today. Only return the topic name, no explanation.`;

      if (allInterests) {
        topicPrompt = `Suggest one highly trending topic in technology, science, or productivity today. 
        Take inspiration from these specific interests: ${allInterests}. 
        Return a specific topic name that would be interesting to someone with these tastes. 
        Only return the topic name, no explanation.`;
      }

      const suggestedTopic = await callPollinations(topicPrompt);
      topic = suggestedTopic.trim();

      // Fallback
      if (!topic && interestTitles.length > 0) {
        topic =
          interestTitles[Math.floor(Math.random() * interestTitles.length)];
      } else if (!topic && listTitles.length > 0) {
        topic = listTitles[0] || 'Technology and Innovation';
      } else if (!topic) {
        topic = 'Latest in AI';
      }
    }

    // 2. Generate article content in JSON format
    const randomSeed = Math.floor(Math.random() * 1000000);
    const contentPrompt = `Write a completely unique, compelling article about "${topic}" (Seed: ${randomSeed}). 
    Format the response as a JSON object with fields: "title", "summary", "content".
    The article should be around 500-700 words (about 2-3 minutes of reading time). 
    Include a catchy, non-generic title, a punchy 1-line summary, and the article body.
    Ensure the "content" field is in Markdown format with excellent structure, using headings, lists, and bold text for readability.
    Avoid clichés and repetitive phrases. 
    Respond ONLY with the raw JSON object, no markdown code blocks.`;

    const rawResponse = await callPollinations(contentPrompt, true);

    let articleData: any;
    try {
      // Clean up potential markdown code block wrappers
      const cleanJson = rawResponse.replace(/```json|```/g, '').trim();
      articleData = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse LLM response as JSON:', rawResponse);
      // Fallback
      articleData = {
        title: topic,
        summary: `A fascinating look into ${topic}.`,
        content: rawResponse
      };
    }

    // 3. Store in database (Images removed)
    const [newArticle] = await db
      .insert(articles)
      .values({
        title: articleData.title || topic,
        summary: articleData.summary || `An exploration of ${topic}`,
        content: articleData.content || rawResponse,
        topic: topic,
        imageUrl: null,
        isPublic: forcePrivate ? 'false' : 'true',
        userId: userId || 'system'
      })
      .returning();

    revalidatePath('/articles');
    return newArticle;
  } catch (error: any) {
    console.error('Error generating article:', error);
    throw new Error(
      `Failed to generate article: ${error.message || 'Unknown error'}`
    );
  }
}

export async function deleteArticleAction(id: string) {
  await db.delete(articles).where(eq(articles.id, id));
  revalidatePath('/articles');
}

export async function toggleArticlePublicAction(id: string, isPublic: boolean) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db
    .update(articles)
    .set({
      isPublic: isPublic ? 'true' : 'false',
      updatedAt: new Date()
    })
    .where(and(eq(articles.id, id), eq(articles.userId, userId)));

  revalidatePath('/articles');
  revalidatePath(`/articles/${id}`);
}

export async function getTopicsFromListsAction() {
  const { userId } = await auth();
  if (!userId) return [];

  const items = await db
    .select({ tags: listItems.tags })
    .from(listItems)
    .where(eq(listItems.userId, userId));

  const tagCounts: Record<string, number> = {};

  items.forEach((item) => {
    if (item.tags) {
      const tags = item.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  // Sort by count descending and return top 15
  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, 15);
}
export async function getInterestsAction() {
  const { userId } = await auth();
  if (!userId) return [];
  return await db
    .select()
    .from(interests)
    .where(eq(interests.userId, userId))
    .orderBy(desc(interests.createdAt));
}

export async function addInterestAction(name: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const [newInterest] = await db
    .insert(interests)
    .values({
      userId,
      name
    })
    .returning();

  revalidatePath('/articles');
  return newInterest;
}

export async function deleteInterestAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db
    .delete(interests)
    .where(and(eq(interests.id, id), eq(interests.userId, userId)));

  revalidatePath('/articles');
}
export async function getGlobalTrendingTopicsAction() {
  const prompt = `Suggest exactly 3 of the most trending, specific, and fascinating topics in technology, science, or productivity today. Only return the topic names separated by commas, no explanation, no numbers.`;
  const result = await callPollinations(prompt);
  return result
    .split(',')
    .map((t: string) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
}
