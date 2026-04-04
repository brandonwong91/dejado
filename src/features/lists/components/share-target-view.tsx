'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  Loader2Icon,
  SparklesIcon,
  XIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { createListItemAction, suggestLinkTitleAction } from '../actions';

interface ShareList {
  id: string;
  name: string;
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/;

function ShareTargetInner({ lists }: { lists: ShareList[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawUrl = searchParams.get('url') ?? '';
  const rawText = searchParams.get('text') ?? '';
  const rawTitle = searchParams.get('title') ?? '';

  const resolvedUrl = URL_PATTERN.test(rawUrl)
    ? rawUrl
    : (rawText.match(URL_PATTERN)?.[0] ?? '');

  const [url] = useState(resolvedUrl);
  const [title, setTitle] = useState(rawTitle);
  const [listId, setListId] = useState(lists[0]?.id ?? '');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Auto-suggest title from URL if no title was shared
  useEffect(() => {
    if (!url || rawTitle) return;
    setIsSuggesting(true);
    suggestLinkTitleAction(url)
      .then((suggested) => {
        if (suggested) setTitle(suggested);
      })
      .catch(() => {})
      .finally(() => setIsSuggesting(false));
  }, [url]);

  const handleSave = async () => {
    if (!url || !listId) return;
    setIsSaving(true);
    try {
      await createListItemAction({ listId, url, title: title || undefined });
      setSaved(true);
    } catch {
      toast.error('Failed to save link');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Try to close the window (works when opened by the OS share sheet)
    window.close();
    // Fallback: navigate to lists
    router.replace('/lists');
  };

  if (!url) {
    return (
      <div className='flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center'>
        <p className='text-muted-foreground text-sm'>No URL was shared.</p>
        <Button variant='outline' onClick={() => router.replace('/lists')}>
          Go to Lists
        </Button>
      </div>
    );
  }

  if (saved) {
    const savedList = lists.find((l) => l.id === listId);
    return (
      <div className='flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center'>
        <div className='bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full'>
          <CheckCircle2Icon className='size-8' />
        </div>
        <div className='space-y-1'>
          <h2 className='text-lg font-semibold'>Link saved!</h2>
          <p className='text-muted-foreground text-sm'>
            Added to <span className='font-medium'>{savedList?.name}</span>
          </p>
        </div>
        <div className='flex gap-3'>
          <Button variant='outline' onClick={handleClose}>
            Close
          </Button>
          <Button onClick={() => router.replace(`/lists`)}>View Lists</Button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex min-h-svh flex-col items-center justify-center p-4'>
      <div className='w-full max-w-sm space-y-6'>
        <div className='flex items-start justify-between'>
          <div>
            <h1 className='text-lg font-semibold'>Save to Dejado</h1>
            <p className='text-muted-foreground text-sm'>
              Add this link to one of your lists
            </p>
          </div>
          <Button
            variant='ghost'
            size='icon'
            className='text-muted-foreground -mt-1 -mr-2 size-8'
            onClick={handleClose}
          >
            <XIcon className='size-4' />
          </Button>
        </div>

        {/* URL preview */}
        <a
          href={url}
          target='_blank'
          rel='noopener noreferrer'
          className='bg-muted/50 flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2'
        >
          <span className='text-muted-foreground min-w-0 flex-1 truncate text-xs'>
            {url}
          </span>
          <ExternalLinkIcon className='text-muted-foreground size-3 shrink-0' />
        </a>

        {/* Title */}
        <div className='space-y-1.5'>
          <label className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
            Title
          </label>
          <div className='relative'>
            <Input
              placeholder='Link title'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className='pr-10'
              disabled={isSuggesting}
            />
            <Button
              variant='ghost'
              size='icon'
              type='button'
              disabled={isSuggesting || !url}
              onClick={() => {
                setIsSuggesting(true);
                suggestLinkTitleAction(url)
                  .then((s) => {
                    if (s) setTitle(s);
                  })
                  .catch(() => {})
                  .finally(() => setIsSuggesting(false));
              }}
              className='text-primary absolute top-1 right-1 h-8 w-8'
              title='AI suggest title'
            >
              {isSuggesting ? (
                <Loader2Icon className='size-4 animate-spin' />
              ) : (
                <SparklesIcon className='size-4' />
              )}
            </Button>
          </div>
        </div>

        {/* List picker */}
        <div className='space-y-1.5'>
          <label className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
            Save to list
          </label>
          {lists.length === 0 ? (
            <p className='text-muted-foreground text-sm'>
              You have no lists yet.{' '}
              <Button
                variant='link'
                className='h-auto p-0 text-sm'
                onClick={() => router.push('/lists')}
              >
                Create one first
              </Button>
            </p>
          ) : (
            <Select value={listId} onValueChange={setListId}>
              <SelectTrigger>
                <SelectValue placeholder='Select a list' />
              </SelectTrigger>
              <SelectContent>
                {lists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button
          className='w-full'
          onClick={handleSave}
          disabled={isSaving || !listId || !url}
        >
          {isSaving ? (
            <>
              <Loader2Icon className='mr-2 size-4 animate-spin' />
              Saving...
            </>
          ) : (
            'Save Link'
          )}
        </Button>
      </div>
    </div>
  );
}

export function ShareTargetView({ lists }: { lists: ShareList[] }) {
  return (
    <Suspense>
      <ShareTargetInner lists={lists} />
    </Suspense>
  );
}
