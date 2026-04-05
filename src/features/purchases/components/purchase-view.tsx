'use client';

import { PurchaseDialog } from './purchase-dialog';
import { PurchaseCard } from './purchase-card';
import { PurchaseCalendar } from './purchase-calendar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronDown,
  ChevronRight,
  ShoppingCartIcon,
  PackageIcon
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { sendNotification } from '@/lib/notifications';
import { cn } from '@/lib/utils';

interface Purchase {
  id: string;
  name: string;
  category: string;
  quantity: string | null;
  dueDate: Date | null;
  tag: string | null;
  frequency: string | null;
  isBought: string;
  lastBoughtAt: Date | null;
  previousBoughtAt: Date | null;
}

interface PurchaseViewProps {
  purchases: Purchase[];
}

export function PurchaseView({ purchases }: PurchaseViewProps) {
  const [toBuyExpanded, setToBuyExpanded] = useState(true);
  const [boughtExpanded, setBoughtExpanded] = useState(true);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dueSoon = purchases.filter((p) => {
      if (p.isBought === 'true' || !p.dueDate) return false;
      const d = new Date(p.dueDate);
      d.setHours(0, 0, 0, 0);
      return d <= tomorrow;
    });

    if (dueSoon.length > 0) {
      sendNotification(
        'Restocking Reminder',
        `${dueSoon.map((p) => p.name).join(', ')} — time to restock.`,
        'purchases-due-soon',
        '/purchases'
      );
    }
  }, []);

  const filterItems = (cat: string, isBought: boolean) => {
    return purchases.filter(
      (p) => p.category === cat && (p.isBought === 'true') === isBought
    );
  };

  const categories = [
    { id: 'Groceries', icon: ShoppingCartIcon },
    { id: 'Essentials', icon: PackageIcon }
  ];

  const renderList = (catId: string, isBought: boolean) => {
    const items = filterItems(catId, isBought);

    if (items.length === 0) {
      return (
        <div className='bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-dashed p-12'>
          <p className='text-muted-foreground'>
            {isBought
              ? 'No items marked as bought yet.'
              : 'All items stocked! Nothing to buy.'}
          </p>
        </div>
      );
    }

    const sorted = [...items].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return (
      <div className='grid gap-3'>
        {sorted.map((item) => (
          <PurchaseCard key={item.id} purchase={item} />
        ))}
      </div>
    );
  };

  return (
    <div className='space-y-8 pb-10'>
      <div className='flex flex-col gap-8 lg:flex-row'>
        {/* Sidebar Panel */}
        <aside className='w-full lg:w-[350px] lg:shrink-0'>
          <div className='sticky top-4 space-y-4'>
            <div className='px-1'>
              <h3 className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                Purchase Schedule
              </h3>
            </div>
            <div className='flex justify-center'>
              <PurchaseCalendar purchases={purchases} />
            </div>
          </div>
        </aside>

        {/* Content Panel */}
        <div className='flex-1 space-y-10'>
          <Tabs defaultValue='Groceries' className='w-full'>
            <TabsList className='bg-muted/40 mb-6 p-1'>
              {categories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className='gap-2 px-6'>
                  <cat.icon className='size-4' />
                  {cat.id}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((cat) => (
              <TabsContent
                key={cat.id}
                value={cat.id}
                className='space-y-10 focus-visible:outline-none'
              >
                {/* To Buy Section */}
                <section className='space-y-6'>
                  <button
                    onClick={() => setToBuyExpanded(!toBuyExpanded)}
                    className='text-muted-foreground/70 hover:text-foreground flex h-8 items-center gap-2 px-1 transition-colors'
                  >
                    {toBuyExpanded ? (
                      <ChevronDown className='size-4' />
                    ) : (
                      <ChevronRight className='size-4' />
                    )}
                    <h3 className='text-xs font-medium tracking-wider uppercase'>
                      To Buy ({filterItems(cat.id, false).length})
                    </h3>
                  </button>

                  {toBuyExpanded && renderList(cat.id, false)}
                </section>

                <Separator className='my-2' />

                {/* Bought Section */}
                <section className='space-y-6'>
                  <button
                    onClick={() => setBoughtExpanded(!boughtExpanded)}
                    className='text-muted-foreground/50 hover:text-foreground flex h-8 items-center gap-2 px-1 transition-colors'
                  >
                    {boughtExpanded ? (
                      <ChevronDown className='size-4' />
                    ) : (
                      <ChevronRight className='size-4' />
                    )}
                    <h3 className='text-xs font-medium tracking-wider uppercase'>
                      Recently Bought ({filterItems(cat.id, true).length})
                    </h3>
                  </button>

                  {boughtExpanded && (
                    <div className='opacity-80 transition-opacity hover:opacity-100'>
                      {renderList(cat.id, true)}
                    </div>
                  )}
                </section>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
