import PageContainer from '@/components/layout/page-container';
import { db } from '@/db';
import { payments } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { PaymentView } from '@/features/payments/components/payment-view';
import { redirect } from 'next/navigation';

export default async function PaymentsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/auth/sign-in');
  }

  const userPayments = await db.query.payments.findMany({
    where: eq(payments.userId, userId)
  });

  return (
    <PageContainer>
      <PaymentView payments={userPayments} />
    </PageContainer>
  );
}
