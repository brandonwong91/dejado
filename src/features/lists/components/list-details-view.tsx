'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CheckIcon,
  LinkIcon,
  PlusIcon,
  Trash2Icon,
  ClipboardIcon,
  GlobeIcon,
  LockIcon,
  Share2Icon,
  UsersIcon,
  ArrowLeftIcon
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createListItemAction,
  deleteListItemAction,
  toggleListItemCompletionAction,
  updateListAction,
  toggleListPublicAction,
  shareListAction
} from '../actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

interface List {
  id: string;
  name: string;
  description: string | null;
  isPublic: string;
  userId: string;
}

interface ListItem {
  id: string;
  listId: string;
  url: string;
  title: string | null;
  platform: string | null;
  tags: string | null;
  isCompleted: string;
}

interface ListDetailsViewProps {
  list: List;
  items: ListItem[];
  isOwner: boolean;
  shares?: { sharedWithEmail: string }[];
}

// Helper to extract the last part of the URL path (the "suffix")
const getUrlSuffix = (url: string) => {
  try {
    const parsed = new URL(url);
    // Split the path and remove empty strings (e.g., from trailing slashes)
    const pathSegments = parsed.pathname.split('/').filter(Boolean);

    if (pathSegments.length > 0) {
      const suffix = pathSegments[pathSegments.length - 1];
      // Truncate just in case the suffix itself is still a massive string
      return suffix.length > 40 ? suffix.substring(0, 40) + '...' : suffix;
    }

    // If it's just a root domain (e.g., https://instagram.com/), fallback to the domain
    return parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    // Fallback for malformed URLs
    return url.length > 40 ? url.substring(0, 40) + '...' : url;
  }
};

// Helper to extract just the domain name, e.g., "instagram.com"
const getDomainOnly = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (e) {
    return 'External Link';
  }
};

export function ListDetailsView({
  list,
  items: initialItems,
  isOwner,
  shares = []
}: ListDetailsViewProps) {
  const [urlInput, setUrlInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(list.name);
  const [shareEmail, setShareEmail] = useState('');
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const handleUpdateName = async () => {
    if (name.trim() !== list.name && name.trim()) {
      try {
        await updateListAction(list.id, { name: name.trim() });
        toast.success('List name updated');
      } catch {
        toast.error('Failed to update list name');
        setName(list.name);
      }
    }
    setIsEditingName(false);
  };

  const handleAddLink = async () => {
    if (!urlInput.trim()) return;
    try {
      await createListItemAction({
        listId: list.id,
        url: urlInput
      });
      setUrlInput('');
      toast.success('Link added');
    } catch (error) {
      toast.error('Failed to add link');
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        setUrlInput(text);
        toast.success('Link pasted from clipboard');
      } else {
        toast.error('Clipboard does not contain a valid URL');
      }
    } catch (e) {
      toast.error('Failed to read clipboard');
    }
  };

  const toggleItemCompletion = async (
    id: string,
    currentlyCompleted: string
  ) => {
    if (!isOwner) return;
    try {
      const newValue = currentlyCompleted === 'true' ? 'false' : 'true';
      await toggleListItemCompletionAction(id, newValue);
    } catch (e) {
      toast.error('Failed to toggle status');
    }
  };

  const deleteItem = async (id: string) => {
    if (!isOwner) return;
    if (!confirm('Delete this link?')) return;
    try {
      await deleteListItemAction(id);
      toast.success('Link deleted');
    } catch (e) {
      toast.error('Failed to delete link');
    }
  };

  const togglePublic = async () => {
    try {
      await toggleListPublicAction(list.id, list.isPublic !== 'true');
      toast.success(
        list.isPublic === 'true' ? 'List is now private' : 'List is now public'
      );
    } catch (e) {
      toast.error('Failed to update visibility');
    }
  };

  const handleShare = async () => {
    if (!shareEmail.trim()) return;
    try {
      await shareListAction(list.id, shareEmail);
      setShareEmail('');
      toast.success(`Shared with ${shareEmail}`);
    } catch (e) {
      toast.error('Failed to share list');
    }
  };

  return (
    <div className='mx-auto w-full max-w-4xl min-w-0 space-y-8 pb-10'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex min-w-0 flex-1 items-start gap-4'>
          <Button
            variant='ghost'
            size='icon'
            asChild
            className='-ml-2 shrink-0'
          >
            <Link href='/lists'>
              <ArrowLeftIcon className='size-5' />
            </Link>
          </Button>
          <div className='min-w-0 flex-1'>
            {isEditingName && isOwner ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleUpdateName}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                autoFocus
                className='h-10 w-full text-2xl font-bold md:max-w-md'
              />
            ) : (
              <div className='flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center'>
                <h1
                  className={`truncate text-2xl font-bold tracking-tight md:text-3xl ${
                    isOwner ? 'cursor-pointer hover:underline' : ''
                  }`}
                  onClick={() => isOwner && setIsEditingName(true)}
                  title={list.name}
                >
                  {list.name}
                </h1>
                <Badge
                  variant={list.isPublic === 'true' ? 'default' : 'secondary'}
                  className='w-fit shrink-0 gap-1'
                >
                  {list.isPublic === 'true' ? (
                    <>
                      <GlobeIcon className='size-3' /> Public
                    </>
                  ) : (
                    <>
                      <LockIcon className='size-3' /> Private
                    </>
                  )}
                </Badge>
              </div>
            )}
            {list.description && (
              <p className='text-muted-foreground mt-1 break-words'>
                {list.description}
              </p>
            )}
          </div>
        </div>

        {isOwner && (
          <div className='flex w-full shrink-0 items-center gap-2 sm:w-auto'>
            <Dialog
              open={isShareDialogOpen}
              onOpenChange={setIsShareDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='w-full gap-2 sm:w-auto'
                >
                  <Share2Icon className='size-4' /> Share
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share List</DialogTitle>
                </DialogHeader>
                <div className='space-y-6 py-4'>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium'>Public Access</label>
                    <div className='flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between'>
                      <div className='space-y-0.5'>
                        <div className='text-sm font-medium'>
                          Make list public
                        </div>
                        <div className='text-muted-foreground text-xs'>
                          Anyone with the link can view this list
                        </div>
                      </div>
                      <Button
                        variant={
                          list.isPublic === 'true' ? 'destructive' : 'default'
                        }
                        size='sm'
                        onClick={togglePublic}
                        className='w-full shrink-0 sm:w-auto'
                      >
                        {list.isPublic === 'true'
                          ? 'Make Private'
                          : 'Make Public'}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className='space-y-4'>
                    <label className='text-sm font-medium'>
                      Invite collaborators
                    </label>
                    <div className='flex flex-col gap-2 sm:flex-row'>
                      <Input
                        placeholder='user@example.com'
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleShare()}
                        className='w-full'
                      />
                      <Button
                        onClick={handleShare}
                        disabled={!shareEmail.trim()}
                        className='w-full shrink-0 sm:w-auto'
                      >
                        Invite
                      </Button>
                    </div>

                    <div className='space-y-2'>
                      <div className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                        Shared with
                      </div>
                      {shares.length === 0 ? (
                        <div className='text-muted-foreground px-1 text-sm italic'>
                          No one yet
                        </div>
                      ) : (
                        <div className='space-y-2'>
                          {shares.map((share) => (
                            <div
                              key={share.sharedWithEmail}
                              className='bg-muted/50 flex flex-col gap-2 rounded-md p-2 px-3 text-sm sm:flex-row sm:items-center sm:justify-between'
                            >
                              <div className='flex min-w-0 items-center gap-2'>
                                <UsersIcon className='text-muted-foreground size-3.5 shrink-0' />
                                <span className='truncate'>
                                  {share.sharedWithEmail}
                                </span>
                              </div>
                              <Badge
                                variant='secondary'
                                className='w-fit text-[10px]'
                              >
                                Viewer
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant='outline'
                    onClick={() => setIsShareDialogOpen(false)}
                    className='w-full sm:w-auto'
                  >
                    Done
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {isOwner && (
        <Card className='w-full overflow-hidden border-dashed'>
          <CardContent className='p-4 pt-4'>
            <div className='flex flex-col gap-4 md:flex-row md:items-center'>
              <div className='flex min-w-0 flex-1 gap-2'>
                <div className='relative min-w-0 flex-1'>
                  <Input
                    placeholder='Add a new link (https://...)'
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className='h-12 w-full pl-10'
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                  />
                  <LinkIcon className='text-muted-foreground absolute top-1/2 left-3 size-5 -translate-y-1/2' />
                </div>
                <Button
                  variant='outline'
                  size='icon'
                  className='h-12 w-12 shrink-0'
                  onClick={handlePasteClipboard}
                  title='Paste from clipboard'
                >
                  <ClipboardIcon className='size-5' />
                </Button>
              </div>
              <Button
                className='h-12 w-full shrink-0 gap-2 md:w-auto'
                onClick={handleAddLink}
                disabled={!urlInput.trim()}
              >
                <PlusIcon className='size-5' /> Save Link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className='w-full overflow-hidden'>
        <CardContent className='p-0'>
          {initialItems.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-20 text-center'>
              <div className='bg-muted mb-4 flex size-12 items-center justify-center rounded-full'>
                <LinkIcon className='text-muted-foreground size-6' />
              </div>
              <p className='text-muted-foreground font-medium'>
                No links in this list yet.
              </p>
              {isOwner && (
                <p className='text-muted-foreground text-sm'>
                  Start adding some above!
                </p>
              )}
            </div>
          ) : (
            <div className='divide-y'>
              {initialItems.map((item) => {
                // AGGRESSIVE FALLBACK:
                // Check if title is null, if it matches the URL exactly, or if it's a raw HTTP string.
                const isTitleRawUrl =
                  !item.title ||
                  item.title === item.url ||
                  item.title.startsWith('http');

                // If it is a raw URL, force the suffix. Otherwise use the safe title.
                const displayTitle = isTitleRawUrl
                  ? getUrlSuffix(item.url)
                  : item.title;
                const displayDomain = getDomainOnly(item.url);

                return (
                  <div
                    key={item.id}
                    className={`hover:bg-muted/30 group flex w-full min-w-0 items-start gap-4 p-4 transition-colors ${
                      item.isCompleted === 'true' ? 'opacity-60' : ''
                    }`}
                  >
                    <button
                      onClick={() =>
                        toggleItemCompletion(item.id, item.isCompleted)
                      }
                      disabled={!isOwner}
                      className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        item.isCompleted === 'true'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/40 hover:border-primary'
                      }`}
                    >
                      {item.isCompleted === 'true' && (
                        <CheckIcon className='size-3' />
                      )}
                    </button>
                    <div className='min-w-0 flex-1 space-y-1 overflow-hidden'>
                      <a
                        href={item.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className={`block max-w-full truncate font-semibold hover:underline sm:text-lg ${
                          item.isCompleted === 'true'
                            ? 'text-muted-foreground line-through'
                            : ''
                        }`}
                        title={item.title || item.url}
                      >
                        {displayTitle}
                      </a>
                      <div className='text-muted-foreground flex w-full min-w-0 items-center gap-2 text-sm'>
                        {item.platform && (
                          <Badge
                            variant='secondary'
                            className='h-5 shrink-0 rounded px-1.5 text-[10px] font-bold tracking-wider uppercase'
                          >
                            {item.platform}
                          </Badge>
                        )}
                        <span className='flex-1 truncate text-xs font-medium'>
                          {displayDomain}
                        </span>
                      </div>
                    </div>
                    {isOwner && (
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => deleteItem(item.id)}
                        className='text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover:opacity-100'
                      >
                        <Trash2Icon className='size-4' />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
