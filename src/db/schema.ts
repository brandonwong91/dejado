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
