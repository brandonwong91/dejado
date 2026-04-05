'use client';

import { useState, useTransition } from 'react';
import { HeartIcon, Trash2Icon, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { deleteAIPostAction, toggleAIPostLikeAction } from '../actions';
import { toast } from 'sonner';

interface Post {
  id: string;
  characterName: string;
  characterUniverse: string;
  avatarBase64: string | null; // from joined character
  caption: string;
  hashtags: string; // JSON string
  imageBase64: string | null;
  isLiked: string;
  likeCount: number;
  createdAt: Date;
}

export function FeedPostCard({ post }: { post: Post }) {
  const [isPending, startTransition] = useTransition();
  const hashtags: string[] = (() => {
    try {
      return JSON.parse(post.hashtags);
    } catch {
      return [];
    }
  })();

  const handleLike = () => {
    startTransition(async () => {
      await toggleAIPostLikeAction(post.id, post.isLiked === 'true');
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteAIPostAction(post.id);
      } catch {
        toast.error('Failed to delete post');
      }
    });
  };

  const liked = post.isLiked === 'true';

  return (
    <div className='bg-card border-border overflow-hidden rounded-2xl border shadow-sm'>
      {/* Header */}
      <div className='flex items-center gap-3 px-4 py-3'>
        <div className='bg-muted size-9 shrink-0 overflow-hidden rounded-full'>
          {post.avatarBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.avatarBase64}
              alt={post.characterName}
              className='size-full object-cover'
            />
          ) : (
            <div className='size-full' />
          )}
        </div>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm leading-tight font-semibold'>
            {post.characterName}
          </p>
          <p className='text-muted-foreground truncate text-[11px]'>
            {post.characterUniverse} ·{' '}
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </p>
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='text-muted-foreground hover:text-destructive size-8 shrink-0'
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2Icon className='size-3.5' />
        </Button>
      </div>

      {/* Image */}
      <div className='bg-muted relative aspect-square w-full overflow-hidden'>
        {post.imageBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.imageBase64}
            alt={post.caption}
            className='size-full object-cover'
          />
        ) : (
          <div className='text-muted-foreground flex size-full flex-col items-center justify-center gap-2'>
            <ImageIcon className='size-8 opacity-30' />
            <span className='text-xs'>Image unavailable</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className='px-4 pt-3 pb-1'>
        <button
          onClick={handleLike}
          disabled={isPending}
          className='group flex items-center gap-1.5'
        >
          <HeartIcon
            className={cn(
              'size-6 transition-all duration-150 group-active:scale-125',
              liked
                ? 'fill-red-500 text-red-500'
                : 'text-foreground hover:text-red-400'
            )}
          />
          <span className='text-sm font-semibold'>
            {post.likeCount.toLocaleString()}
          </span>
        </button>
      </div>

      {/* Caption + hashtags */}
      <div className='space-y-1 px-4 pb-4'>
        <p className='text-sm leading-relaxed'>
          <span className='mr-1.5 font-semibold'>{post.characterName}</span>
          {post.caption}
        </p>
        {hashtags.length > 0 && (
          <p className='text-primary/70 text-sm'>
            {hashtags.map((h) => `#${h}`).join(' ')}
          </p>
        )}
      </div>
    </div>
  );
}
