'use client';

import PageContainer from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useOrganization, PricingTable } from '@clerk/nextjs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertCircle } from 'lucide-react';
import { billingInfoContent } from '@/config/infoconfig';
import ErrorBoundary from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function BillingPage() {
  const { organization, isLoaded } = useOrganization();

  return (
    <PageContainer
      isloading={!isLoaded}
      access={!!organization}
      accessFallback={
        <div className='flex min-h-[400px] items-center justify-center'>
          <div className='space-y-2 text-center'>
            <h2 className='text-2xl font-semibold'>No Organization Selected</h2>
            <p className='text-muted-foreground'>
              Please select or create an organization to view billing
              information.
            </p>
          </div>
        </div>
      }
      infoContent={billingInfoContent}
      pageTitle='Billing & Plans'
      pageDescription={`Manage your subscription and usage limits for ${organization?.name}`}
    >
      <div className='space-y-6'>
        {/* Info Alert */}
        <Alert>
          <Info className='h-4 w-4' />
          <AlertDescription>
            Plans and subscriptions are managed through Clerk Billing. Subscribe
            to a plan to unlock features and higher limits.
          </AlertDescription>
        </Alert>

        {/* Clerk Pricing Table */}
        <Card>
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>
              Choose a plan that fits your organization's needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='mx-auto max-w-4xl'>
              <ErrorBoundary
                fallback={
                  <div className='flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center'>
                    <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 ring-8 ring-red-50 dark:bg-red-900/20 dark:ring-red-900/10'>
                      <AlertCircle className='h-6 w-6 text-red-600 dark:text-red-400' />
                    </div>
                    <h3 className='mb-2 text-xl font-semibold'>
                      Billing Not Enabled
                    </h3>
                    <p className='text-muted-foreground mx-auto max-w-md'>
                      The Pricing Table cannot be rendered because billing is
                      currently disabled in your Clerk configuration.
                    </p>
                    <div className='mt-6 flex flex-wrap items-center justify-center gap-4'>
                      <Button asChild variant='default'>
                        <Link
                          href='https://dashboard.clerk.com/last-active?path=billing/settings'
                          target='_blank'
                        >
                          Enable Billing in Dashboard
                        </Link>
                      </Button>
                      <Button asChild variant='outline'>
                        <Link
                          href='https://clerk.com/docs/billing/overview'
                          target='_blank'
                        >
                          View Documentation
                        </Link>
                      </Button>
                    </div>
                  </div>
                }
              >
                <PricingTable for='organization' />
              </ErrorBoundary>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
