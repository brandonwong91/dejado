'use server';

import { db } from '@/db';
import { articles, listItems } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { eq, desc, sql } from 'drizzle-orm';

export interface ArticleData {
  title: string;
  topic?: string;
  summary?: string;
  content: string;
  imageUrl?: string;
}

export async function getArticlesAction() {
  return await db.select().from(articles).orderBy(desc(articles.createdAt));
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

export async function generateArticleAction(customTopic?: string) {
  try {
    // 1. Choose a topic (either custom or trending)
    let topic = customTopic;
    if (!topic) {
      // Fetch some random list items to provide context for the AI
      const randomItems = await db
        .select({ title: listItems.title })
        .from(listItems)
        .orderBy(sql`RANDOM()`)
        .limit(10);

      const interests = randomItems
        .map((item) => item.title)
        .filter(Boolean)
        .join(', ');

      let topicPrompt = `Suggest one highly trending topic in technology, science, or productivity today. Only return the topic name, no explanation.`;

      if (interests) {
        topicPrompt = `Suggest one highly trending topic in technology, science, or productivity today. 
        Take inspiration from these interests: ${interests}. 
        Return a specific topic name that would be interesting to someone with these tastes. 
        Only return the topic name, no explanation.`;
      }

      const suggestedTopic = await callPollinations(topicPrompt);
      topic = suggestedTopic.trim();

      // If the model returned an empty string or something went wrong,
      // check if we have any interest to use as a fallback topic
      if (!topic && randomItems.length > 0) {
        topic = randomItems[0].title || 'Technology and Innovation';
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
        isPublic: 'true'
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
  await db
    .update(articles)
    .set({
      isPublic: isPublic ? 'true' : 'false',
      updatedAt: new Date()
    })
    .where(eq(articles.id, id));

  revalidatePath('/articles');
  revalidatePath(`/articles/${id}`);
}
