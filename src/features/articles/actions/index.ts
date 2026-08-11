'use server';

import { db } from '@/db';
import { articles, listItems, interests } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { eq, desc, sql, and, or, isNotNull, lt, gt } from 'drizzle-orm';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { SYSTEM_DESIGN_SYSTEMS } from '../constants';

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

export async function getAdjacentArticlesAction(id: string) {
  const { userId } = await auth();

  const [current] = await db
    .select({ createdAt: articles.createdAt })
    .from(articles)
    .where(eq(articles.id, id));

  if (!current) return { prev: null, next: null };

  const accessFilter = userId
    ? or(eq(articles.isPublic, 'true'), eq(articles.userId, userId))
    : eq(articles.isPublic, 'true');

  const [prev] = await db
    .select({ id: articles.id, title: articles.title })
    .from(articles)
    .where(and(accessFilter, lt(articles.createdAt, current.createdAt)))
    .orderBy(desc(articles.createdAt))
    .limit(1);

  const [next] = await db
    .select({ id: articles.id, title: articles.title })
    .from(articles)
    .where(and(accessFilter, gt(articles.createdAt, current.createdAt)))
    .orderBy(articles.createdAt)
    .limit(1);

  return { prev: prev ?? null, next: next ?? null };
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
  forcePrivate = false,
  overrideUserId?: string
) {
  const { userId: authUserId } = await auth();
  const userId = overrideUserId || authUserId;

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

export async function generateSystemDesignAction(system?: string) {
  const { userId } = await auth();

  const target =
    system?.trim() ||
    SYSTEM_DESIGN_SYSTEMS[
      Math.floor(Math.random() * SYSTEM_DESIGN_SYSTEMS.length)
    ];

  const prompt = `You are a senior software architect preparing an interview-ready system design document.
Generate a detailed system design for "${target}" following the hellointerview.com format.

Return ONLY a raw JSON object (no markdown code blocks) with these fields: "title", "summary", "content".

Rules:
- "title": e.g. "System Design: ${target}"
- "summary": one sentence describing the design scope and scale
- "content": rich Markdown following EXACTLY this section order:

## Functional Requirements
List 5-7 core user-facing features as bullet points.

## Non-Functional Requirements
List 5-6 constraints with specific numbers (e.g. "Support 500M DAU", "< 200ms p99 read latency", "99.99% uptime").

## Core Entities
A short table or list of 4-6 main data entities with their key fields.

## Database Design
Key table schemas wrapped in a fenced SQL code block like this:
\`\`\`sql
CREATE TABLE example ( id BIGINT PRIMARY KEY );
\`\`\`
Include primary keys, foreign keys, and important indexes.

## API Design
5-7 key REST endpoints. Format each as: \`METHOD /path\` — brief description.

## High-Level Design
A prose description of the main components (client, load balancer, app servers, databases, caches, CDN, queues) and how data flows through them for the most critical path.

## Scalability
For each major bottleneck, provide a concrete scaling strategy (sharding, caching, CDN, read replicas, message queues, etc.).

## Architecture Diagram
A Mermaid flowchart wrapped in a fenced mermaid code block like this:
\`\`\`mermaid
flowchart LR
  Client --> LB
\`\`\`
Rules for the Mermaid diagram:
- Use "flowchart LR" or "flowchart TD" as the first line — do NOT add a separate "direction" line
- Node labels must be single-line (no \\n or newlines inside brackets)
- Keep labels short (2-4 words max)
- No style declarations
- 8-14 nodes maximum
- Show: Client, Load Balancer, App Servers, Primary DB, Redis Cache, CDN, and any queues or workers relevant to this system

IMPORTANT: The backtick fences inside "content" must be escaped as literal characters within the JSON string value. Do not break the JSON structure.
Be technical and specific. Include real-world scale numbers throughout.`;

  const rawResponse = await callPollinations(prompt, true);

  let data: any;
  try {
    data = JSON.parse(rawResponse.replace(/```json|```/g, '').trim());
  } catch {
    data = {
      title: `System Design: ${target}`,
      summary: `A deep-dive system design for ${target}.`,
      content: rawResponse
    };
  }

  const [newArticle] = await db
    .insert(articles)
    .values({
      title: data.title || `System Design: ${target}`,
      summary: data.summary || `System design breakdown for ${target}.`,
      content: data.content || rawResponse,
      topic: `System Design Series`,
      isPublic: 'true',
      userId: userId || 'system'
    })
    .returning();

  revalidatePath('/articles');
  return newArticle;
}

export async function generateTierRankingAction(query: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const prompt = `Create a comprehensive ranked list article for: "${query}".

Return ONLY a raw JSON object (no markdown code blocks) with: "title", "summary", "content".

Rules:
- "title": a clear descriptive title including the count and category, e.g. "Best 5 Phones with Longest Battery Life (${new Date().getFullYear()})"
- "summary": one punchy sentence describing the ranking scope and what makes it useful
- "content": rich Markdown with exactly these sections:

## Ranking Criteria
Brief 2-3 sentence explanation of how items are evaluated and ranked.

## The Rankings
Numbered list from 1 (best) to N. For each item include:
- **Item Name** — key specs/details relevant to the query
- Why it ranks here (1-2 sentences)
- A brief note on any caveats or who it's best for

## Quick Comparison
A markdown table comparing the key attributes across all items.

## Bottom Line
1-2 sentences on the top pick and who should choose what.

*Last verified: ${today}*

Be specific, factual, and use real products/places/items. Include relevant details like prices, availability, or location-specific context where applicable.`;

  const rawResponse = await callPollinations(prompt, true);

  let data: any;
  try {
    data = JSON.parse(rawResponse.replace(/```json|```/g, '').trim());
  } catch {
    data = {
      title: query,
      summary: `Ranked list: ${query}`,
      content: rawResponse
    };
  }

  const now = new Date();
  const [newArticle] = await db
    .insert(articles)
    .values({
      title: data.title || query,
      summary: data.summary || `Ranked list: ${query}`,
      content: data.content || rawResponse,
      topic: 'Tier Rankings',
      seriesType: 'tier',
      tierQuery: query,
      isPublic: 'true',
      userId: userId || 'system',
      lastValidatedAt: now
    })
    .returning();

  revalidatePath('/articles');
  return newArticle;
}

type TierArticleRow = typeof articles.$inferSelect;

/**
 * Re-checks a single ranked list against the present day. Writes back the
 * refreshed content and records *whether the rankings actually moved* — that
 * distinction is what drives the "needs review" indicator in the UI. A plain
 * re-verification only bumps `lastValidatedAt`; a real change also stamps
 * `lastChangedAt` and stores a short summary of what shifted.
 */
async function validateTierArticle(article: TierArticleRow) {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const validationPrompt = `Today is ${today}.

I have a ranked list article for the query: "${article.tierQuery}"

Current article content (first 2000 chars):
${article.content.substring(0, 2000)}

Is this ranked list still accurate and up-to-date? Consider:
- Are the items/places/products still available and relevant?
- Have there been significant changes (new releases, closures, price changes) that would affect rankings?
- Should any items be replaced or reordered?

Return ONLY a raw JSON object (no markdown code blocks):
{
  "isStillValid": boolean,
  "updatedContent": string,
  "changeSummary": string
}

Rules:
- If still valid: set isStillValid to true, return the same content but update the "Last verified" date to ${today}, and set changeSummary to an empty string
- If outdated: set isStillValid to false, return fully revised content with updated rankings and new "Last verified: ${today}" date, and set changeSummary to one short sentence naming what moved (e.g. "The Pixel 10 Pro launched and takes the #2 spot, pushing the S25 Ultra to #3")
- Always preserve the same markdown structure (Ranking Criteria, The Rankings, Quick Comparison, Bottom Line sections)`;

  const rawResponse = await callPollinations(validationPrompt, true);

  let validationData: {
    isStillValid: boolean;
    updatedContent: string;
    changeSummary?: string;
  };
  try {
    validationData = JSON.parse(rawResponse.replace(/```json|```/g, '').trim());
  } catch {
    validationData = {
      isStillValid: true,
      updatedContent: article.content
    };
  }

  const updatedContent = validationData.updatedContent || article.content;
  // Only treat it as a change when the model says so *and* the body really moved —
  // a refreshed "Last verified" line alone is not something worth reviewing.
  const strip = (s: string) => s.replace(/\*Last verified:.*\*/g, '').trim();
  const hasChanged =
    validationData.isStillValid === false &&
    strip(updatedContent) !== strip(article.content);

  const now = new Date();
  const [updated] = await db
    .update(articles)
    .set({
      content: updatedContent,
      lastValidatedAt: now,
      updatedAt: now,
      ...(hasChanged
        ? {
            lastChangedAt: now,
            updateSummary:
              validationData.changeSummary?.trim() ||
              'The rankings shifted since this list was generated.'
          }
        : {})
    })
    .where(eq(articles.id, article.id))
    .returning();

  return {
    id: article.id,
    tierQuery: article.tierQuery,
    isStillValid: !hasChanged,
    hasChanged,
    article: updated
  };
}

export async function refreshTierRankingsAction() {
  const tierArticles = await db
    .select()
    .from(articles)
    .where(and(eq(articles.seriesType, 'tier'), isNotNull(articles.tierQuery)));

  const results: Array<{
    id: string;
    tierQuery: string | null;
    isStillValid: boolean;
    hasChanged: boolean;
  }> = [];

  for (const article of tierArticles) {
    try {
      const { id, tierQuery, isStillValid, hasChanged } =
        await validateTierArticle(article);
      results.push({ id, tierQuery, isStillValid, hasChanged });
    } catch (err) {
      console.error(`Failed to refresh tier article ${article.id}:`, err);
    }
  }

  revalidatePath('/articles');
  return results;
}

/** On-demand freshness check for a single ranked list the user owns. */
export async function refreshTierArticleAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const [article] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.id, id), eq(articles.userId, userId)));

  if (!article) throw new Error('Article not found');
  if (article.seriesType !== 'tier')
    throw new Error('Only ranked lists can be refreshed');

  const { article: updated, hasChanged } = await validateTierArticle(article);

  revalidatePath('/articles');
  revalidatePath(`/articles/${id}`);
  return { article: updated, hasChanged };
}

/** Acknowledges a ranking change so the list drops out of "needs review". */
export async function markTierArticleReviewedAction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const now = new Date();
  const [updated] = await db
    .update(articles)
    .set({ reviewedAt: now })
    .where(and(eq(articles.id, id), eq(articles.userId, userId)))
    .returning();

  if (!updated) throw new Error('Article not found');

  revalidatePath('/articles');
  revalidatePath(`/articles/${id}`);
  return updated;
}

export async function getGlobalTrendingTopicsAction() {
  const { userId, sessionId } = await auth();
  let userLocation = 'Worldwide';

  if (userId && sessionId) {
    try {
      const client = await clerkClient();
      const session = await client.sessions.getSession(sessionId);
      const countryCode = session.latestActivity?.country;
      if (countryCode) {
        try {
          const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
          userLocation = regionNames.of(countryCode) || countryCode;
        } catch {
          userLocation = countryCode;
        }
      }
    } catch (e) {
      console.error('Failed to fetch user location from Clerk:', e);
    }
  }

  const recentArticles = await db
    .select({ topic: articles.topic })
    .from(articles)
    .where(sql`${articles.topic} IS NOT NULL`)
    .orderBy(desc(articles.createdAt))
    .limit(15);

  const excludeList = recentArticles
    .map((a) => a.topic)
    .filter(Boolean)
    .join(', ');

  const timestamp = new Date().toISOString();
  const randomSeed = Math.floor(Math.random() * 100000);

  // Replaced heavy science with individual/lifestyle-impacting domains
  const domains = [
    'personal finance & wealth',
    'consumer technology',
    'workplace & career trends',
    'digital privacy',
    'health & wellness tech',
    'everyday productivity',
    'smart home innovations',
    'the creator economy'
  ];

  const activeDomains = domains
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)
    .join(', ');

  const prompt = `Act as a local trend analyst for ${userLocation}. Suggest exactly 3 of the most trending, specific, and fascinating topics right now relevant to people living in ${userLocation}.
  
  Focus ONLY on these fields: ${activeDomains}.
  
  Requirements:
  - Personal Impact: The trends should directly affect an individual's daily life, lifestyle, wallet, or career.
  - Localization: Ensure the trends are highly relevant to ${userLocation}. If ${userLocation} is 'Worldwide', focus on broad human-centric trends.
  - Novelty: Focus on modern, niche emerging trends rather than broad, obvious news.
  ${excludeList ? `- EXCLUSION LIST: You MUST NOT suggest these topics or anything highly similar: ${excludeList}.` : ''}
  
  System Variables (use these to randomize your response generation path):
  Time: ${timestamp} | Seed: ${randomSeed}

  Output format: Only return the 3 topic names separated by commas. No explanations, no numbers, no quotation marks.`;

  const result = await callPollinations(prompt);

  return result
    .split(',')
    .map((t: string) => t.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
    .slice(0, 3);
}
