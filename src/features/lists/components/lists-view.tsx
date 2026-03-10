'use client';

import { useState } from 'react';
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

export function ListsView({
  lists,
  items
}: {
  lists: List[];
  items: ListItem[];
}) {
  const [activeListId, setActiveListId] = useState<string>(lists[0]?.id || '');
  const [urlInput, setUrlInput] = useState('');
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');

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
    <div className='flex flex-col space-y-6'>
      <div className='bg-card rounded-xl border p-4 shadow-sm'>
        <div className='flex flex-col gap-4 sm:flex-row'>
          <div className='flex flex-1 gap-2'>
            <div className='relative flex-1'>
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
            <SelectTrigger className='h-12 w-full sm:w-[200px]'>
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
            className='h-12 shrink-0 gap-2'
            onClick={handleAddLink}
            disabled={!urlInput.trim() || !activeListId}
          >
            <PlusIcon className='size-5' /> Save Link
          </Button>
        </div>
      </div>

      <div className='flex items-center justify-between'>
        <Tabs
          value={activeListId}
          onValueChange={setActiveListId}
          className='w-full'
        >
          <div className='flex w-full items-center justify-between overflow-x-auto pb-2'>
            <TabsList className='h-10 justify-start'>
              {lists.map((list) => (
                <TabsTrigger key={list.id} value={list.id} className='px-4'>
                  {list.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <Dialog open={isAddingList} onOpenChange={setIsAddingList}>
              <DialogTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='ml-4 gap-2 border-dashed'
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
                  <Button
                    variant='outline'
                    onClick={() => setIsAddingList(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddList}
                    disabled={!newListName.trim()}
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {lists.map((list) => (
            <TabsContent
              key={list.id}
              value={list.id}
              className='mt-6 space-y-4'
            >
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-bold'>Links in {list.name}</h3>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => deleteList(list.id)}
                  className='text-muted-foreground hover:text-destructive'
                >
                  <Trash2Icon className='mr-2 size-4' /> Delete List
                </Button>
              </div>

              {activeItems.length === 0 ? (
                <div className='bg-card/50 flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center shadow-sm'>
                  <LinkIcon className='text-muted-foreground/30 mb-4 size-10' />
                  <p className='text-muted-foreground text-sm font-medium'>
                    No links in this list yet.
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    Paste a link above to get started.
                  </p>
                </div>
              ) : (
                <div className='grid gap-3'>
                  {activeItems.map((item) => (
                    <Card
                      key={item.id}
                      className={`transition-colors ${
                        item.isCompleted === 'true'
                          ? 'bg-muted/30 opacity-70'
                          : ''
                      }`}
                    >
                      <CardContent className='flex items-center gap-4 p-4'>
                        <button
                          onClick={() =>
                            toggleItemCompletion(item.id, item.isCompleted)
                          }
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            item.isCompleted === 'true'
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/30 hover:border-primary'
                          }`}
                        >
                          {item.isCompleted === 'true' && (
                            <CheckIcon className='size-3.5 object-contain' />
                          )}
                        </button>

                        <div className='min-w-0 flex-1'>
                          <a
                            href={item.url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className={`text-sm font-semibold hover:underline ${
                              item.isCompleted === 'true'
                                ? 'text-muted-foreground line-through'
                                : ''
                            }`}
                          >
                            {item.title || item.url}
                          </a>
                          <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                            {item.platform && (
                              <Badge
                                variant='secondary'
                                className='h-4 rounded-sm px-1 text-[10px]'
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
                          onClick={() => deleteItem(item.id)}
                          className='text-muted-foreground hover:text-destructive shrink-0 opacity-50 transition-opacity hover:opacity-100'
                        >
                          <Trash2Icon className='size-4' />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}

          {lists.length === 0 && (
            <div className='flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center shadow-sm'>
              <p className='text-muted-foreground mb-4 text-sm font-medium'>
                You don't have any lists yet.
              </p>
              <Button onClick={() => setIsAddingList(true)} variant='outline'>
                <PlusIcon className='mr-2 size-4' /> Create a List
              </Button>
            </div>
          )}
        </Tabs>
      </div>
    </div>
  );
}
