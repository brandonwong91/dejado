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
