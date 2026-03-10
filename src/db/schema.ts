import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
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
