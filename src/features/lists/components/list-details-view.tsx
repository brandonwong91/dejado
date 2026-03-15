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
    <div className='mx-auto max-w-4xl space-y-8 pb-10'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' asChild className='-ml-2'>
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
              className='h-10 max-w-md text-2xl font-bold'
            />
          ) : (
            <div className='flex items-center gap-3'>
              <h1
                className={`truncate text-2xl font-bold tracking-tight md:text-3xl ${
                  isOwner ? 'cursor-pointer hover:underline' : ''
                }`}
                onClick={() => isOwner && setIsEditingName(true)}
              >
                {list.name}
              </h1>
              <Badge
                variant={list.isPublic === 'true' ? 'default' : 'secondary'}
                className='gap-1'
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
            <p className='text-muted-foreground mt-1'>{list.description}</p>
          )}
        </div>

        {isOwner && (
          <div className='flex items-center gap-2'>
            <Dialog
              open={isShareDialogOpen}
              onOpenChange={setIsShareDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant='outline' size='sm' className='gap-2'>
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
                    <div className='flex items-center justify-between rounded-lg border p-4'>
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
                    <div className='flex gap-2'>
                      <Input
                        placeholder='user@example.com'
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleShare()}
                      />
                      <Button
                        onClick={handleShare}
                        disabled={!shareEmail.trim()}
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
                              className='bg-muted/50 flex items-center justify-between rounded-md p-2 px-3 text-sm'
                            >
                              <div className='flex items-center gap-2'>
                                <UsersIcon className='text-muted-foreground size-3.5' />
                                {share.sharedWithEmail}
                              </div>
                              <Badge
                                variant='secondary'
                                className='text-[10px]'
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
        <Card className='border-dashed'>
          <CardContent className='p-4 pt-4'>
            <div className='flex flex-col gap-2 sm:flex-row'>
              <div className='relative flex-1'>
                <Input
                  placeholder='Add a new link (https://...)'
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className='h-12 pl-10'
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                />
                <LinkIcon className='text-muted-foreground absolute top-1/2 left-3 size-5 -translate-y-1/2' />
              </div>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='icon'
                  className='h-12 w-12 shrink-0'
                  onClick={handlePasteClipboard}
                  title='Paste from clipboard'
                >
                  <ClipboardIcon className='size-5' />
                </Button>
                <Button
                  className='h-12 flex-1 gap-2 sm:w-auto'
                  onClick={handleAddLink}
                  disabled={!urlInput.trim()}
                >
                  <PlusIcon className='size-5' /> Save Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
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
              {initialItems.map((item) => (
                <div
                  key={item.id}
                  className={`hover:bg-muted/30 group flex items-start gap-4 p-4 transition-colors ${
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
                  <div className='min-w-0 flex-1 space-y-1'>
                    <a
                      href={item.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className={`block font-semibold hover:underline sm:text-lg ${
                        item.isCompleted === 'true'
                          ? 'text-muted-foreground line-through'
                          : ''
                      }`}
                    >
                      {item.title || item.url}
                    </a>
                    <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                      {item.platform && (
                        <Badge
                          variant='secondary'
                          className='h-5 rounded px-1.5 text-[10px] font-bold tracking-wider uppercase'
                        >
                          {item.platform}
                        </Badge>
                      )}
                      <span className='truncate'>{item.url}</span>
                    </div>
                  </div>
                  {isOwner && (
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => deleteItem(item.id)}
                      className='text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100'
                    >
                      <Trash2Icon className='size-4' />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
