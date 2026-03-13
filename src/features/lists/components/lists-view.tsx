'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  CheckIcon,
  LinkIcon,
  PlusIcon,
  Trash2Icon,
  ClipboardIcon
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createListAction,
  createListItemAction,
  deleteListAction,
  deleteListItemAction,
  updateListItemAction,
  updateListAction,
  toggleListItemCompletionAction
} from '../actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface List {
  id: string;
  name: string;
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

function ListsViewInner({
  lists,
  items
}: {
  lists: List[];
  items: ListItem[];
}) {
  const searchParams = useSearchParams();
  const [activeListId, setActiveListId] = useState<string>(lists[0]?.id || '');
  const [urlInput, setUrlInput] = useState('');
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    const sharedText = searchParams.get('text');
    const sharedUrl = searchParams.get('url');
    // Mobile OS sometimes puts URL in text or URL.
    const urlPattern = /(https?:\/\/[^\s]+)/;
    if (sharedUrl && urlPattern.test(sharedUrl)) {
      setUrlInput(sharedUrl);
      toast.success('Ready to save shared link!');
    } else if (sharedText && urlPattern.test(sharedText)) {
      const match = sharedText.match(urlPattern);
      if (match) setUrlInput(match[0]);
      toast.success('Ready to save shared link!');
    }
  }, [searchParams]);

  const activeItems = items.filter((item) => item.listId === activeListId);

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

  const handleAddLink = async () => {
    if (!urlInput.trim()) return;
    if (!activeListId) {
      toast.error('Please select or create a list first');
      return;
    }

    try {
      await createListItemAction({
        listId: activeListId,
        url: urlInput
      });
      setUrlInput('');
      toast.success('Link added');
    } catch (error) {
      toast.error('Failed to add link');
    }
  };

  const handleAddList = async () => {
    if (!newListName.trim()) return;
    try {
      await createListAction({ name: newListName });
      setNewListName('');
      setIsAddingList(false);
      toast.success('List created');
      // If no active list, we might want to set it, but page will reload and choose first
    } catch (e) {
      toast.error('Failed to create list');
    }
  };

  const toggleItemCompletion = async (
    id: string,
    currentlyCompleted: string
  ) => {
    try {
      const newValue = currentlyCompleted === 'true' ? 'false' : 'true';
      await toggleListItemCompletionAction(id, newValue);
    } catch (e) {
      toast.error('Failed to toggle status');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this link?')) return;
    try {
      await deleteListItemAction(id);
      toast.success('Link deleted');
    } catch (e) {
      toast.error('Failed to delete link');
    }
  };

  const deleteList = async (id: string) => {
    if (!confirm('Delete this list and all its links?')) return;
    try {
      await deleteListAction(id);
      setActiveListId(lists.find((l) => l.id !== id)?.id || '');
      toast.success('List deleted');
    } catch (e) {
      toast.error('Failed to delete list');
    }
  };

  return (
    <div className='space-y-8 pb-10'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>
            Your Lists
          </h2>
          <p className='text-muted-foreground text-sm md:text-base'>
            Manage your links and items neatly.
          </p>
        </div>
      </div>

      <div className='bg-card w-full min-w-0 rounded-xl border p-4 shadow-sm'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center'>
          <div className='flex flex-1 gap-2'>
            <div className='relative min-w-0 flex-1'>
              <Input
                placeholder='Paste a link here (https://...)'
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className='h-12 pl-10'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddLink();
                }}
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
          <Select
            value={activeListId}
            onValueChange={setActiveListId}
            disabled={lists.length === 0}
          >
            <SelectTrigger className='h-12 w-full md:w-[200px]'>
              <SelectValue placeholder='Select a list' />
            </SelectTrigger>
            <SelectContent>
              {lists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className='h-12 w-full shrink-0 gap-2 md:w-auto'
            onClick={handleAddLink}
            disabled={!urlInput.trim() || !activeListId}
          >
            <PlusIcon className='size-5' /> Save Link
          </Button>
        </div>
      </div>

      <div className='flex items-center justify-between px-1'>
        <h3 className='text-xl font-bold tracking-tight'>All Lists</h3>
        <Dialog open={isAddingList} onOpenChange={setIsAddingList}>
          <DialogTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              className='h-10 gap-2 border-dashed'
            >
              <PlusIcon className='size-4' /> New List
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New List</DialogTitle>
            </DialogHeader>
            <div className='py-4'>
              <label className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                List Name
              </label>
              <Input
                className='mt-2'
                placeholder='e.g., Cooking, Dev Tools, Places'
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddList();
                }}
              />
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setIsAddingList(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddList} disabled={!newListName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {lists.length === 0 ? (
        <div className='flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center shadow-sm'>
          <p className='text-muted-foreground mb-4 text-sm font-medium'>
            You don't have any lists yet.
          </p>
          <Button onClick={() => setIsAddingList(true)} variant='outline'>
            <PlusIcon className='mr-2 size-4' /> Create a List
          </Button>
        </div>
      ) : (
        <div className='grid w-full min-w-0 grid-cols-1 items-start gap-6 pb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {lists.map((list) => {
            const listItems = items.filter((item) => item.listId === list.id);
            return (
              <ListCard
                key={list.id}
                list={list}
                items={listItems}
                onDelete={() => deleteList(list.id)}
                onToggleItem={toggleItemCompletion}
                onDeleteItem={deleteItem}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ListCard({
  list,
  items,
  onDelete,
  onToggleItem,
  onDeleteItem
}: {
  list: List;
  items: ListItem[];
  onDelete: () => void;
  onToggleItem: (id: string, isCompleted: string) => void;
  onDeleteItem: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(list.name);

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
    setIsEditing(false);
  };

  return (
    <Card className='border-t-primary w-full min-w-0 overflow-hidden border-t-4 shadow-sm transition-shadow hover:shadow-md'>
      <div className='bg-muted/20 flex items-center justify-between gap-2 border-b p-3'>
        <div className='min-w-0 flex-1'>
          {isEditing ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleUpdateName}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
              autoFocus
              className='h-8 w-full text-sm font-bold'
            />
          ) : (
            <h3
              className='cursor-pointer truncate pl-1 text-sm font-bold hover:underline'
              onClick={() => setIsEditing(true)}
              title='Click to edit name'
            >
              {list.name}
            </h3>
          )}
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='text-muted-foreground hover:text-destructive h-8 w-8 shrink-0'
          onClick={onDelete}
          title='Delete List'
        >
          <Trash2Icon className='size-4' />
        </Button>
      </div>
      <CardContent className='flex min-w-0 flex-col gap-2 p-3'>
        {items.length === 0 ? (
          <div className='text-muted-foreground py-6 text-center text-xs italic'>
            No links in this list yet.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`hover:bg-muted/50 group flex min-w-0 items-start gap-3 rounded-md p-2 transition-colors ${
                item.isCompleted === 'true' ? 'opacity-60' : ''
              }`}
            >
              <button
                onClick={() => onToggleItem(item.id, item.isCompleted)}
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                  item.isCompleted === 'true'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/40 hover:border-primary'
                }`}
              >
                {item.isCompleted === 'true' && (
                  <CheckIcon className='size-2.5 object-contain' />
                )}
              </button>
              <div className='min-w-0 flex-1 leading-tight'>
                <a
                  href={item.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className={`block truncate text-xs font-semibold hover:underline ${
                    item.isCompleted === 'true'
                      ? 'text-muted-foreground line-through'
                      : ''
                  }`}
                  title={item.title || item.url}
                >
                  {item.title || item.url}
                </a>
                <div className='text-muted-foreground mt-1 flex items-center gap-1 text-[10px]'>
                  {item.platform && (
                    <Badge
                      variant='secondary'
                      className='h-3 rounded-[2px] px-1 text-[8px] tracking-wider uppercase'
                    >
                      {item.platform}
                    </Badge>
                  )}
                  <span className='truncate'>{item.url}</span>
                </div>
              </div>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => onDeleteItem(item.id)}
                className='text-muted-foreground hover:text-destructive h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100'
              >
                <Trash2Icon className='size-3' />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function ListsView({
  lists,
  items
}: {
  lists: List[];
  items: ListItem[];
}) {
  return (
    <Suspense
      fallback={
        <div className='flex justify-center p-8'>
          <div className='bg-primary size-8 animate-pulse rounded-full' />
        </div>
      }
    >
      <ListsViewInner lists={lists} items={items} />
    </Suspense>
  );
}
