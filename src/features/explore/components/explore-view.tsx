'use client';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GlobeIcon,
  LinkIcon,
  ListIcon,
  SearchIcon,
  UserIcon
} from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { getPublicListsAction } from '../actions';
import { useExploreStore } from '../store';

export function ExploreView({ userId }: { userId: string | null }) {
  const { lists, userId: cachedUserId, setLists } = useExploreStore();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Skip fetch if cache belongs to the current user and has data
    if (cachedUserId === userId && lists.length > 0) return;

    setLoading(true);
    getPublicListsAction()
      .then((data) => setLists(data, userId))
      .finally(() => setLoading(false));
  }, [userId]);

  const filteredLists = lists.filter(
    (list) =>
      list.name.toLowerCase().includes(search.toLowerCase()) ||
      list.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className='space-y-8 pb-10'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>
            Explore Public Lists
          </h2>
          <p className='text-muted-foreground text-sm md:text-base'>
            Browse and discover curated links shared by the community.
          </p>
        </div>
        {!userId && (
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' asChild>
              <Link href='/auth/sign-in'>Sign In</Link>
            </Button>
            <Button size='sm' asChild>
              <Link href='/auth/sign-up'>Get Started</Link>
            </Button>
          </div>
        )}
      </div>

      <div className='relative w-full max-w-md'>
        <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
        <Input
          placeholder='Search lists...'
          className='h-12 pl-10'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className='grid w-full min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className='bg-muted h-40 animate-pulse rounded-xl border'
            />
          ))}
        </div>
      ) : filteredLists.length === 0 ? (
        <div className='bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center'>
          <ListIcon className='text-muted-foreground mb-4 size-12 opacity-20' />
          <p className='text-muted-foreground font-medium'>
            No public lists found matching your search.
          </p>
        </div>
      ) : (
        <div className='grid w-full min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {filteredLists.map((list) => (
            <Card
              key={list.id}
              className='group flex flex-col transition-shadow hover:shadow-md'
            >
              <CardHeader className='pb-3'>
                <div className='flex items-start justify-between gap-2'>
                  <CardTitle className='group-hover:text-primary text-xl transition-colors'>
                    {list.name}
                  </CardTitle>
                  <Badge variant='secondary' className='shrink-0 gap-1'>
                    <GlobeIcon className='size-3' /> Public
                  </Badge>
                </div>
                {list.description && (
                  <p className='text-muted-foreground mt-1 line-clamp-2 text-sm'>
                    {list.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className='flex-1 pb-3'>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <LinkIcon className='size-4' />
                  <span>{list.itemCount} Links</span>
                </div>
              </CardContent>
              <CardFooter className='pt-0'>
                <Button variant='outline' className='w-full' asChild>
                  <Link href={`/lists/${list.id}`}>View List</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
