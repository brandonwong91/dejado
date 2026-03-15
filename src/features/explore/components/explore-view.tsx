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
import { useState } from 'react';

interface PublicList {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  itemCount: number;
}

export function ExploreView({ lists }: { lists: PublicList[] }) {
  const [search, setSearch] = useState('');

  const filteredLists = lists.filter(
    (list) =>
      list.name.toLowerCase().includes(search.toLowerCase()) ||
      list.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className='space-y-8 pb-10'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>
            Explore Public Lists
          </h2>
          <p className='text-muted-foreground'>
            Browse and discover curated links shared by the community.
          </p>
        </div>
      </div>

      <div className='relative max-w-md'>
        <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
        <Input
          placeholder='Search lists...'
          className='pl-10'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredLists.length === 0 ? (
        <div className='bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center'>
          <ListIcon className='text-muted-foreground mb-4 size-12 opacity-20' />
          <p className='text-muted-foreground font-medium'>
            No public lists found matching your search.
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
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
