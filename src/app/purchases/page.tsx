import PageContainer from '@/components/layout/page-container';
import { db } from '@/db';
import { purchases } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, desc } from 'drizzle-orm';
import { PurchaseView, PurchaseDialog } from '@/features/purchases/components';
import { redirect } from 'next/navigation';

export default async function PurchasesPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/auth/sign-in');
  }

  const allPurchases = await db
    .select()
    .from(purchases)
    .where(eq(purchases.userId, userId))
    .orderBy(desc(purchases.createdAt));

  return (
    <PageContainer
      pageTitle='Inventory & Purchases'
      pageDescription='Track your groceries and essentials to predict your next shopping trip.'
      pageHeaderAction={<PurchaseDialog />}
    >
      <PurchaseView purchases={allPurchases} />
    </PageContainer>
  );
}
