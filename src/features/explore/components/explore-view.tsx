'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowRightIcon,
  ExternalLinkIcon,
  LinkIcon,
  ListIcon,
  NewspaperIcon,
  SearchIcon
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { getPublicListsAction, getPublicArticlesAction } from '../actions';
import { useExploreStore } from '../store';
import type { PublicList, PublicArticle } from '../actions';

type Filter = 'all' | 'articles' | 'lists';

type FeedItem =
  | ({ kind: 'article' } & PublicArticle)
  | ({ kind: 'list' } & PublicList);

function FeedSkeleton() {
  return (
    <div className='space-y-4'>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className='bg-muted h-32 animate-pulse rounded-xl border'
        />
      ))}
    </div>
  );
}

function ArticleFeedItem({ item }: { item: PublicArticle }) {
  return (
    <article className='group border-b py-5 first:pt-0 last:border-b-0'>
      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0 flex-1 space-y-2'>
          <div className='space-y-1.5'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge
                variant='secondary'
                className='bg-primary/10 text-primary gap-1 px-2 py-0.5 text-[10px] tracking-widest uppercase'
              >
                <NewspaperIcon className='size-2.5' />
                Article
              </Badge>
              <span className='text-muted-foreground text-xs'>
                {formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true
                })}
              </span>
            </div>
            {item.topic && (
              <Badge
                variant='outline'
                className='max-w-full truncate px-2 py-0.5 text-[10px] tracking-wider uppercase'
              >
                {item.topic}
              </Badge>
            )}
          </div>
          <h3 className='group-hover:text-primary text-base leading-snug font-semibold transition-colors md:text-lg'>
            <Link href={`/articles/${item.id}`}>{item.title}</Link>
          </h3>
          {item.summary && (
            <p className='text-muted-foreground line-clamp-2 text-sm leading-relaxed'>
              {item.summary}
            </p>
          )}
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='text-muted-foreground group-hover:text-primary mt-1 shrink-0 transition-colors'
          asChild
        >
          <Link href={`/articles/${item.id}`}>
            <ArrowRightIcon className='size-4' />
          </Link>
        </Button>
      </div>
    </article>
  );
}

function ListFeedItem({ item }: { item: PublicList }) {
  const previewItems = item.items.slice(0, 4);

  return (
    <article className='group border-b py-5 first:pt-0 last:border-b-0'>
      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0 flex-1 space-y-2'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge
              variant='secondary'
              className='gap-1 px-2 py-0.5 text-[10px] tracking-widest uppercase'
            >
              <ListIcon className='size-2.5' />
              List
            </Badge>
            <span className='text-muted-foreground text-xs'>
              {formatDistanceToNow(new Date(item.createdAt), {
                addSuffix: true
              })}
            </span>
          </div>
          <h3 className='group-hover:text-primary text-base leading-snug font-semibold transition-colors md:text-lg'>
            <Link href={`/lists/${item.id}`}>{item.name}</Link>
          </h3>
          {item.description && (
            <p className='text-muted-foreground line-clamp-2 text-sm leading-relaxed'>
              {item.description}
            </p>
          )}
          {previewItems.length > 0 && (
            <ul className='space-y-1.5 pt-1'>
              {previewItems.map((link) => (
                <li key={link.id} className='flex min-w-0 items-center gap-2'>
                  <LinkIcon className='text-muted-foreground size-3 shrink-0' />
                  <a
                    href={link.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-1 truncate text-xs transition-colors'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className='truncate'>{link.title || link.url}</span>
                    <ExternalLinkIcon className='size-2.5 shrink-0 opacity-50' />
                  </a>
                  {link.platform && (
                    <span className='text-muted-foreground shrink-0 text-[10px] capitalize opacity-60'>
                      {link.platform}
                    </span>
                  )}
                </li>
              ))}
              {item.itemCount > 4 && (
                <li className='text-muted-foreground pl-5 text-xs'>
                  +{item.itemCount - 4} more links
                </li>
              )}
            </ul>
          )}
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='text-muted-foreground group-hover:text-primary mt-1 shrink-0 transition-colors'
          asChild
        >
          <Link href={`/lists/${item.id}`}>
            <ArrowRightIcon className='size-4' />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function ExploreView({ userId }: { userId: string | null }) {
  const { lists, articles, userId: cachedUserId, setData } = useExploreStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cachedUserId === userId && (lists.length > 0 || articles.length > 0))
      return;

    setLoading(true);
    Promise.all([getPublicListsAction(), getPublicArticlesAction()])
      .then(([l, a]) => setData(l, a, userId))
      .finally(() => setLoading(false));
  }, [userId]);

  const q = search.toLowerCase();

  const feed: FeedItem[] = [
    ...(filter !== 'lists'
      ? articles
          .filter(
            (a) =>
              a.title.toLowerCase().includes(q) ||
              a.summary?.toLowerCase().includes(q) ||
              a.topic?.toLowerCase().includes(q)
          )
          .map((a) => ({ kind: 'article' as const, ...a }))
      : []),
    ...(filter !== 'articles'
      ? lists
          .filter(
            (l) =>
              l.name.toLowerCase().includes(q) ||
              l.description?.toLowerCase().includes(q)
          )
          .map((l) => ({ kind: 'list' as const, ...l }))
      : [])
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className='space-y-6 pb-10'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <div className='relative flex-1'>
          <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
          <Input
            placeholder='Search...'
            className='h-9 pl-10'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value='all'>All</TabsTrigger>
            <TabsTrigger value='articles'>
              <NewspaperIcon className='mr-1.5 size-3.5' />
              Articles
            </TabsTrigger>
            <TabsTrigger value='lists'>
              <ListIcon className='mr-1.5 size-3.5' />
              Lists
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {!userId && (
          <div className='flex shrink-0 items-center gap-2'>
            <Button variant='outline' size='sm' asChild>
              <Link href='/auth/sign-in'>Sign In</Link>
            </Button>
            <Button size='sm' asChild>
              <Link href='/auth/sign-up'>Get Started</Link>
            </Button>
          </div>
        )}
      </div>

      <div className='mx-auto max-w-2xl'>
        {loading ? (
          <FeedSkeleton />
        ) : feed.length === 0 ? (
          <div className='bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center'>
            <ListIcon className='text-muted-foreground mb-4 size-12 opacity-20' />
            <p className='text-muted-foreground font-medium'>
              No results found{search ? ` for "${search}"` : ''}.
            </p>
          </div>
        ) : (
          <div>
            {feed.map((item) =>
              item.kind === 'article' ? (
                <ArticleFeedItem key={`a-${item.id}`} item={item} />
              ) : (
                <ListFeedItem key={`l-${item.id}`} item={item} />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
