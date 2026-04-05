'use client';

import { useTransition } from 'react';
import {
  Loader2Icon,
  RefreshCwIcon,
  SparklesIcon,
  Trash2Icon
} from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteAICharacterAction,
  generateAIPostAction,
  regenerateCharacterAvatarAction
} from '../actions';
import { useAIFeedUI } from '../store';
import { CreateCharacterDialog } from './create-character-dialog';
import { FeedPostCard } from './feed-post-card';

interface Character {
  id: string;
  name: string;
  universe: string;
  personality: string | null;
  avatarBase64: string | null;
  createdAt: Date;
}

interface Post {
  id: string;
  characterName: string;
  characterUniverse: string;
  avatarBase64: string | null;
  caption: string;
  hashtags: string;
  imageBase64: string | null;
  isLiked: string;
  likeCount: number;
  createdAt: Date;
}

function CharacterBubble({
  character,
  generating,
  refreshingAvatar,
  onGenerate,
  onDelete,
  onRefreshAvatar,
  disabled
}: {
  character: Character;
  generating: boolean;
  refreshingAvatar: boolean;
  onGenerate: () => void;
  onDelete: () => void;
  onRefreshAvatar: () => void;
  disabled: boolean;
}) {
  return (
    <div className='group flex shrink-0 flex-col items-center gap-1.5 pt-2'>
      <button
        onClick={onGenerate}
        disabled={generating || disabled}
        className='relative'
        title={`Generate post for ${character.name}`}
      >
        <div className='from-primary via-primary/70 to-primary/30 rounded-full bg-linear-to-tr p-[2px]'>
          <div className='bg-background rounded-full p-[2px]'>
            <div className='bg-muted relative size-14 overflow-hidden rounded-full'>
              {character.avatarBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={character.avatarBase64}
                  alt={character.name}
                  className='size-full object-cover'
                />
              ) : (
                <div className='text-muted-foreground/30 flex size-full items-center justify-center text-lg font-bold'>
                  {character.name[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
        {(generating || refreshingAvatar) && (
          <div className='bg-background/80 absolute inset-0 flex items-center justify-center rounded-full'>
            <Loader2Icon className='text-primary size-5 animate-spin' />
          </div>
        )}
        {!generating && !refreshingAvatar && (
          <div className='bg-primary border-background absolute right-0 bottom-0 flex size-5 items-center justify-center rounded-full border-2'>
            <SparklesIcon className='size-2.5 text-white' />
          </div>
        )}
      </button>
      <div className='flex w-16 items-center justify-center gap-1'>
        <span className='min-w-0 flex-1 text-center text-[11px] font-medium'>
          {character.name}
        </span>
        {!character.avatarBase64 && !refreshingAvatar && (
          <button
            onClick={onRefreshAvatar}
            disabled={disabled}
            className='text-muted-foreground/40 hover:text-primary shrink-0 transition-colors'
            title='Generate avatar'
          >
            <RefreshCwIcon className='size-3' />
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={disabled}
          className='text-muted-foreground/40 hover:text-destructive invisible shrink-0 transition-colors group-hover:visible'
        >
          <Trash2Icon className='size-3' />
        </button>
      </div>
    </div>
  );
}

interface AIFeedViewProps {
  characters: Character[];
  posts: Post[];
}

export function AIFeedView({ characters, posts }: AIFeedViewProps) {
  const { generatingFor, setGeneratingFor } = useAIFeedUI();
  const [isPending, startTransition] = useTransition();
  const [refreshingAvatarFor, setRefreshingAvatarFor] = useTransition();

  const handleGenerate = (characterId: string) => {
    const character = characters.find((c) => c.id === characterId);
    if (!character) return;
    setGeneratingFor(characterId);
    startTransition(async () => {
      try {
        await generateAIPostAction(characterId);
      } catch {
        toast.error(`Failed to generate post for ${character.name}`);
      } finally {
        setGeneratingFor(null);
      }
    });
  };

  const handleRefreshAvatar = (characterId: string) => {
    setRefreshingAvatarFor(async () => {
      try {
        await regenerateCharacterAvatarAction(characterId);
      } catch {
        toast.error('Failed to generate avatar');
      }
    });
  };

  const handleDeleteCharacter = (characterId: string) => {
    startTransition(async () => {
      try {
        await deleteAICharacterAction(characterId);
      } catch {
        toast.error('Failed to delete character');
      }
    });
  };

  return (
    <div className='mx-auto max-w-sm space-y-6 pb-20'>
      {/* Characters row */}
      <div className='space-y-3'>
        <h2 className='text-muted-foreground text-xs font-semibold tracking-widest uppercase'>
          Your Characters
        </h2>
        <div className='flex flex-wrap justify-start gap-3 pb-1'>
          <CreateCharacterDialog />
          {characters.map((c) => (
            <CharacterBubble
              key={c.id}
              character={c}
              generating={generatingFor === c.id}
              refreshingAvatar={refreshingAvatarFor}
              onGenerate={() => handleGenerate(c.id)}
              onRefreshAvatar={() => handleRefreshAvatar(c.id)}
              onDelete={() => handleDeleteCharacter(c.id)}
              disabled={isPending || refreshingAvatarFor}
            />
          ))}
        </div>
      </div>

      {/* Empty state */}
      {characters.length === 0 && (
        <div className='border-border rounded-2xl border border-dashed py-16 text-center'>
          <SparklesIcon className='text-muted-foreground/40 mx-auto mb-3 size-10' />
          <p className='font-semibold'>No characters yet</p>
          <p className='text-muted-foreground mt-1 px-4 text-sm'>
            Add a character to start generating their posts.
          </p>
        </div>
      )}

      {characters.length > 0 && posts.length === 0 && (
        <div className='border-border rounded-2xl border border-dashed py-12 text-center'>
          <p className='text-muted-foreground px-4 text-sm'>
            Tap a character above to generate their first post.
          </p>
        </div>
      )}

      {/* Feed */}
      <div className='space-y-6'>
        {posts.map((post) => (
          <FeedPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
