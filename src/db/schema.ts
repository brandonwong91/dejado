import {
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  uniqueIndex
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Using Clerk's user ID for simplicity
  name: text('name').notNull(),
  dueDate: timestamp('due_date').notNull(),
  currency: text('currency').notNull().default('USD'),
  amount: text('amount').notNull(), // Using text to avoid precision issues with float in simple demo
  tag: text('tag'),
  frequency: text('frequency').notNull(), // e.g. "30" for 30 days
  isPaid: text('is_paid').default('false').notNull(), // boolean-like text
  paidAt: timestamp('paid_at'),
  previousAmount: text('previous_amount'), // tracks last amount before an edit for % change display
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const purchases = pgTable('purchases', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull().default('Groceries'), // Groceries | Essentials
  tag: text('tag'),
  quantity: text('quantity'),
  dueDate: timestamp('due_date'), // Predicted next purchase date
  frequency: text('frequency'), // predicted frequency in days
  isBought: text('is_bought').default('false').notNull(),
  lastBoughtAt: timestamp('last_bought_at'),
  previousBoughtAt: timestamp('previous_bought_at'), // To calculate new frequency
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const exercises = pgTable('exercises', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  type: text('type').default('weighted').notNull(), // weighted | bodyweight
  bestScore: text('best_score'),
  lastAttemptedAt: timestamp('last_attempted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const workouts = pgTable('workouts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  scheduledDays: text('scheduled_days'), // e.g., "Mon,Wed,Fri"
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const workoutExercises = pgTable('workout_exercises', {
  id: uuid('id').defaultRandom().primaryKey(),
  workoutId: uuid('workout_id')
    .references(() => workouts.id, { onDelete: 'cascade' })
    .notNull(),
  exerciseId: uuid('exercise_id')
    .references(() => exercises.id, { onDelete: 'cascade' })
    .notNull(),
  order: text('order').default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const workoutSessions = pgTable('workout_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  workoutId: uuid('workout_id').references(() => workouts.id, {
    onDelete: 'set null'
  }),
  workoutName: text('workout_name'), // Snapshot name in case workout is deleted
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const exerciseSets = pgTable('exercise_sets', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id')
    .references(() => workoutSessions.id, { onDelete: 'cascade' })
    .notNull(),
  exerciseId: uuid('exercise_id')
    .references(() => exercises.id, { onDelete: 'cascade' })
    .notNull(),
  weight: text('weight'), // in kg
  reps: text('reps'),
  order: text('order').default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const lists = pgTable('lists', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  isPublic: text('is_public').default('false').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const listShares = pgTable('list_shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  listId: uuid('list_id')
    .references(() => lists.id, { onDelete: 'cascade' })
    .notNull(),
  sharedWithEmail: text('shared_with_email').notNull(), // email of the user to share with
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const listItems = pgTable('list_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  listId: uuid('list_id')
    .references(() => lists.id, { onDelete: 'cascade' })
    .notNull(),
  url: text('url').notNull(),
  title: text('title'),
  platform: text('platform'), // extracted platform (e.g., "youtube", "twitter")
  tags: text('tags'), // comma-separated personal tags
  isCompleted: text('is_completed').default('false').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const articles = pgTable('articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  topic: text('topic'),
  summary: text('summary'),
  imageUrl: text('image_url'),
  isPublic: text('is_public').default('true').notNull(),
  userId: text('user_id'), // Optional: could be "system" or a specific user
  seriesType: text('series_type'), // 'tier' | null
  tierQuery: text('tier_query'), // Original search query for tier ranking articles
  lastValidatedAt: timestamp('last_validated_at'), // When tier list was last checked against reality
  lastChangedAt: timestamp('last_changed_at'), // When a check actually changed the rankings
  updateSummary: text('update_summary'), // What changed on the most recent ranking change
  reviewedAt: timestamp('reviewed_at'), // When the owner last acknowledged a ranking change
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const aiCharacters = pgTable('ai_characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  universe: text('universe').notNull(),
  personality: text('personality'),
  avatarBase64: text('avatar_base64'), // full data URL
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const aiPosts = pgTable('ai_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  characterId: uuid('character_id').references(() => aiCharacters.id, {
    onDelete: 'set null'
  }),
  characterName: text('character_name').notNull(),
  characterUniverse: text('character_universe').notNull(),
  caption: text('caption').notNull(),
  hashtags: text('hashtags').notNull().default('[]'), // JSON array
  imagePrompt: text('image_prompt').notNull(),
  imageBase64: text('image_base64'), // full data URL
  isLiked: text('is_liked').default('false').notNull(),
  likeCount: integer('like_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const interests = pgTable('interests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const dailyWords = pgTable('daily_words', {
  date: text('date').notNull().unique(),
  word: text('word').notNull(),
  category: text('category').notNull(),
  openingRiddle: text('opening_riddle').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const dailySummaries = pgTable(
  'daily_summaries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(), // 'YYYY-MM-DD' — one record per user per day
    title: text('title').notNull(),
    body: text('body').notNull(),
    isRead: text('is_read').default('false').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('daily_summaries_user_date_idx').on(table.userId, table.date)
  ]
);

// ── Chat profiling ───────────────────────────────────────────────────────────
//
// See docs/superpowers/specs/2026-07-27-chat-personality-profiling-design.md.
// `mode` on conversations and messages is load-bearing: every profiling query
// must filter to mode = 'assistant', or Mirror Mode output gets re-profiled as
// though the user wrote it.

export const chatConversations = pgTable(
  'chat_conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    title: text('title'), // named by the model after a few turns
    mode: text('mode').notNull().default('assistant'), // 'assistant' | 'mirror'
    messageCount: integer('message_count').default(0).notNull(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    lastMessageAt: timestamp('last_message_at').defaultNow().notNull()
  },
  (table) => [
    index('chat_conversations_user_last_idx').on(
      table.userId,
      table.lastMessageAt
    )
  ]
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => chatConversations.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    role: text('role').notNull(), // 'user' | 'assistant'
    content: text('content').notNull(),
    mode: text('mode').notNull().default('assistant'),
    starterId: uuid('starter_id'), // set when the turn began from a suggestion

    // ── Tier 0 — deterministic, computed at insert, no LLM ──────────────────
    charCount: integer('char_count').default(0).notNull(),
    wordCount: integer('word_count').default(0).notNull(),
    sentenceCount: integer('sentence_count').default(0).notNull(),
    questionCount: integer('question_count').default(0).notNull(),
    exclamationCount: integer('exclamation_count').default(0).notNull(),
    emojiCount: integer('emoji_count').default(0).notNull(),
    hedgeCount: integer('hedge_count').default(0).notNull(),
    intensifierCount: integer('intensifier_count').default(0).notNull(),
    uppercaseRatio: real('uppercase_ratio').default(0).notNull(),
    firstPersonRatio: real('first_person_ratio').default(0).notNull(),
    secondPersonRatio: real('second_person_ratio').default(0).notNull(),
    collectiveRatio: real('collective_ratio').default(0).notNull(),
    avgWordLength: real('avg_word_length').default(0).notNull(),
    typeTokenRatio: real('type_token_ratio').default(0).notNull(),
    capStyle: text('cap_style').default('sentence').notNull(), // lower | sentence | upper
    responseLatencyMs: integer('response_latency_ms'), // null on assistant rows
    localHour: integer('local_hour').default(0).notNull(),
    localDow: integer('local_dow').default(0).notNull(),

    // ── Tier 1 — batched LLM tagging ────────────────────────────────────────
    enrichedAt: timestamp('enriched_at'),
    enrichAttempts: integer('enrich_attempts').default(0).notNull(),
    signals: text('signals'), // JSON — see chat-profile/schemas

    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    index('chat_messages_user_created_idx').on(table.userId, table.createdAt),
    index('chat_messages_conversation_idx').on(
      table.conversationId,
      table.createdAt
    ),
    index('chat_messages_enrich_queue_idx').on(table.enrichedAt, table.role)
  ]
);

export const profileSettings = pgTable('profile_settings', {
  userId: text('user_id').primaryKey(),
  profilingEnabled: text('profiling_enabled').default('false').notNull(),
  mirrorEnabled: text('mirror_enabled').default('false').notNull(),
  consentedAt: timestamp('consented_at'),
  retentionDays: integer('retention_days').default(365).notNull(),
  excludedCategories: text('excluded_categories').default('[]').notNull(), // JSON array
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const userTopics = pgTable(
  'user_topics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    slug: text('slug').notNull(),
    label: text('label').notNull(),
    category: text('category').default('general').notNull(),
    score: real('score').default(0).notNull(), // recency-decayed, rebuilt nightly
    mentionCount: integer('mention_count').default(0).notNull(),
    sentimentAvg: real('sentiment_avg').default(0).notNull(),
    status: text('status').default('active').notNull(), // active | muted | pinned
    source: text('source').default('chat').notNull(), // chat | interests | purchases | ...
    firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('user_topics_user_slug_idx').on(table.userId, table.slug),
    index('user_topics_user_score_idx').on(table.userId, table.score)
  ]
);

export const profileSnapshots = pgTable(
  'profile_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(), // 'YYYY-MM-DD'
    traits: text('traits').notNull().default('{}'), // JSON — score/confidence/evidence
    style: text('style').notNull().default('{}'), // JSON — aggregated Tier 0
    topTopics: text('top_topics').notNull().default('[]'), // JSON — denormalized
    values: text('values').notNull().default('[]'), // JSON
    archetype: text('archetype'),
    confidence: real('confidence').default(0).notNull(),
    sourceMessageCount: integer('source_message_count').default(0).notNull(),
    daysObserved: integer('days_observed').default(0).notNull(),
    modelVersion: text('model_version').default('v1').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('profile_snapshots_user_date_idx').on(table.userId, table.date)
  ]
);

export const conversationStarters = pgTable(
  'conversation_starters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    text: text('text').notNull(),
    kind: text('kind').notNull(), // follow_up | deep_dive | revival | adjacency | gap_probe | temporal | cross_feature
    anchorSlug: text('anchor_slug'),
    rationale: text('rationale'),
    score: real('score').default(0).notNull(),
    status: text('status').default('pending').notNull(), // pending | shown | accepted | dismissed | expired
    shownAt: timestamp('shown_at'),
    respondedAt: timestamp('responded_at'),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    index('conversation_starters_user_status_idx').on(
      table.userId,
      table.status
    )
  ]
);

export const personaConfigs = pgTable('persona_configs', {
  userId: text('user_id').primaryKey(),
  systemPrompt: text('system_prompt').notNull(),
  styleParams: text('style_params').notNull().default('{}'), // JSON
  exemplars: text('exemplars').notNull().default('[]'), // JSON array of message strings
  snapshotId: uuid('snapshot_id'),
  backingMessageCount: integer('backing_message_count').default(0).notNull(),
  version: integer('version').default(1).notNull(),
  lastBuiltAt: timestamp('last_built_at').defaultNow().notNull()
});

export const traitCorrections = pgTable(
  'trait_corrections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    trait: text('trait').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [index('trait_corrections_user_idx').on(table.userId, table.trait)]
);

export const dailyPlays = pgTable(
  'daily_plays',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    guesses: text('guesses').notNull().default('[]'), // JSON-serialized Guess[]
    status: text('status').notNull().default('playing'), // 'playing' | 'won' | 'lost'
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('daily_plays_user_date_idx').on(table.userId, table.date)
  ]
);
