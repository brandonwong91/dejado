'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2Icon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { createAICharacterAction } from '../actions';

const SUGGESTED = [
  { name: 'Pikachu', universe: 'Pokémon' },
  { name: 'Hello Kitty', universe: 'Sanrio' },
  { name: 'SpongeBob', universe: 'SpongeBob SquarePants' },
  { name: 'Totoro', universe: 'Studio Ghibli' },
  { name: 'Stitch', universe: 'Lilo & Stitch' },
  { name: 'Doraemon', universe: 'Doraemon' },
  { name: 'Naruto', universe: 'Naruto' },
  { name: 'Goku', universe: 'Dragon Ball Z' },
  { name: 'Mario', universe: 'Super Mario' },
  { name: 'Kirby', universe: 'Nintendo' }
];

export function CreateCharacterDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [universe, setUniverse] = useState('');
  const [personality, setPersonality] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    if (!name.trim() || !universe.trim()) return;
    startTransition(async () => {
      try {
        await createAICharacterAction(
          name.trim(),
          universe.trim(),
          personality.trim() || undefined
        );
        setName('');
        setUniverse('');
        setPersonality('');
        setOpen(false);
      } catch {
        toast.error('Failed to create character');
      }
    });
  };

  const fillSuggestion = (s: { name: string; universe: string }) => {
    setName(s.name);
    setUniverse(s.universe);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && setOpen(v)}>
      <DialogTrigger asChild>
        <button className='border-border bg-muted/40 hover:bg-muted flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-dashed px-4 py-3 transition-colors'>
          <div className='border-primary/40 flex size-14 items-center justify-center rounded-full border-2 border-dashed'>
            <PlusIcon className='text-primary size-6' />
          </div>
          <span className='text-muted-foreground w-16 truncate text-center text-[11px]'>
            Add
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>Add a Character</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          {/* Quick suggestions */}
          <div>
            <Label className='text-muted-foreground mb-2 block text-xs tracking-wider uppercase'>
              Popular picks
            </Label>
            <div className='flex flex-wrap gap-1.5'>
              {SUGGESTED.map((s) => (
                <button
                  key={s.name}
                  onClick={() => fillSuggestion(s)}
                  disabled={isPending}
                  className='bg-muted hover:bg-primary hover:text-primary-foreground rounded-full px-3 py-1 text-xs font-medium transition-colors'
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='char-name'>Character name</Label>
              <Input
                id='char-name'
                placeholder='e.g. Pikachu'
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='char-universe'>Universe / Franchise</Label>
              <Input
                id='char-universe'
                placeholder='e.g. Pokémon'
                value={universe}
                onChange={(e) => setUniverse(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='char-personality'>
                Personality{' '}
                <span className='text-muted-foreground font-normal'>
                  (optional)
                </span>
              </Label>
              <Textarea
                id='char-personality'
                placeholder='Any extra personality notes…'
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                className='resize-none'
                rows={2}
                disabled={isPending}
              />
            </div>
          </div>

          <Button
            className='w-full'
            onClick={handleAdd}
            disabled={!name.trim() || !universe.trim() || isPending}
          >
            {isPending ? (
              <>
                <Loader2Icon className='mr-2 size-4 animate-spin' />
                Creating…
              </>
            ) : (
              'Add Character'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
