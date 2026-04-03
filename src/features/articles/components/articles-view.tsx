'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  PlusIcon,
  SparklesIcon,
  Loader2Icon,
  BookOpenIcon,
  Share2Icon,
  Trash2Icon,
  ArrowRightIcon,
  NewspaperIcon,
  SearchIcon,
  TrendingUpIcon,
  GlobeIcon,
  LockIcon,
  XIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';
import {
  generateArticleAction,
  deleteArticleAction,
  getArticlesAction,
  toggleArticlePublicAction,
  addInterestAction,
  deleteInterestAction,
  getGlobalTrendingTopicsAction
} from '../actions';
import { useGlobalTrendsStore } from '../store';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';

const SUGGESTED_TOPICS = [
  'Artificial Intelligence',
  'Space Exploration',
  'Quantum Computing',
  'Sustainability',
  'Longevity Science',
  'Creator Economy',
  'Neuroscience'
];

interface Article {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  topic: string | null;
  imageUrl: string | null;
  isPublic: string;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserInterest {
  id: string;
  name: string;
}

interface ArticlesViewProps {
  initialArticles: Article[];
  initialTopics: string[];
  initialInterests: UserInterest[];
}

export function ArticlesView({
  initialArticles,
  initialTopics,
  initialInterests
}: ArticlesViewProps) {
  const { user } = useUser();
  const {
    trends: cachedTrends,
    userId: cachedUserId,
    setTrends: storeTrends
  } = useGlobalTrendsStore();
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTopic, setSearchTopic] = useState('');
  const [personalTopics, setPersonalTopics] = useState<string[]>(initialTopics);
  const [managedInterests, setManagedInterests] = useState<UserInterest[]>(
    initialInterests || []
  );
  const [newInterestInput, setNewInterestInput] = useState('');
  const [isAddingInterest, setIsAddingInterest] = useState(false);
  const [globalTrends, setGlobalTrends] = useState<string[]>(
    cachedUserId === user?.id ? cachedTrends : []
  );
  const [isFetchingTrends, setIsFetchingTrends] = useState(false);

  useEffect(() => {
    // Skip fetch if we already have trends cached for this user
    if (cachedUserId === user?.id && cachedTrends.length > 0) return;
    handleFetchGlobalTrends();
  }, [user?.id]);

  const handleGenerateArticle = async (
    selectedTopic?: string,
    isPersonal = false
  ) => {
    const topicToUse = selectedTopic || searchTopic;
    setIsGenerating(true);
    const toastId = toast.loading(
      topicToUse
        ? `Generating content about "${topicToUse}"...`
        : 'Generating a new article from trending topics...'
    );
    try {
      // If it's a personal topic, generate it as private
      const newArticle = await generateArticleAction(topicToUse, isPersonal);
      setArticles((prev) => [newArticle, ...prev]);
      setSearchTopic('');
      toast.success(
        isPersonal
          ? 'Successfully generated a private article!'
          : 'Successfully generated a new article!',
        { id: toastId }
      );
    } catch (e) {
      toast.error('Failed to generate article. Please try again.', {
        id: toastId
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      await deleteArticleAction(id);
      setArticles((prev) => prev.filter((a) => a.id !== id));
      toast.success('Article deleted');
    } catch (e) {
      toast.error('Failed to delete article');
    }
  };

  const handleShare = (id: string, title: string) => {
    const url = `${window.location.origin}/articles/${id}`;
    if (navigator.share) {
      navigator
        .share({
          title,
          text: `Check out this article: ${title}`,
          url
        })
        .catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleTogglePublic = async (id: string, isPublic: boolean) => {
    try {
      await toggleArticlePublicAction(id, isPublic);
      setArticles((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, isPublic: isPublic ? 'true' : 'false' } : a
        )
      );
      toast.success(isPublic ? 'Article published!' : 'Article made private');
    } catch (e) {
      toast.error('Failed to update article visibility');
    }
  };

  const handleAddInterest = async () => {
    if (!newInterestInput.trim()) return;
    setIsAddingInterest(true);
    try {
      const interest = await addInterestAction(newInterestInput.trim());
      setManagedInterests((prev) => [interest, ...prev]);
      setNewInterestInput('');
      toast.success('Interest added');
    } catch (e) {
      toast.error('Failed to add interest');
    } finally {
      setIsAddingInterest(false);
    }
  };

  const handleDeleteInterest = async (id: string) => {
    try {
      await deleteInterestAction(id);
      setManagedInterests((prev) => prev.filter((i) => i.id !== id));
      toast.success('Interest removed');
    } catch (e) {
      toast.error('Failed to remove interest');
    }
  };

  const handleFetchGlobalTrends = async () => {
    setIsFetchingTrends(true);
    try {
      const trends = await getGlobalTrendingTopicsAction();
      setGlobalTrends(trends);
      storeTrends(trends, user?.id ?? null);
      if (trends.length > 0) {
        toast.success('Found top 3 global trends!');
      }
    } catch (e) {
      toast.error('Failed to fetch trending topics');
    } finally {
      setIsFetchingTrends(false);
    }
  };

  return (
    <div className='mx-auto max-w-6xl space-y-12 pb-20'>
      <div className='flex flex-col gap-8'>
        <div className='space-y-2 text-center md:text-left'>
          <h2 className='text-3xl font-bold tracking-tight md:text-5xl'>
            Daily Intelligence
          </h2>
          <p className='text-muted-foreground text-lg md:text-xl'>
            AI-curated insights on the trends that shape our future.
          </p>
        </div>

        <Card className='border-primary/10 bg-muted/20 overflow-hidden border-2 shadow-lg backdrop-blur-sm transition-all'>
          <CardContent className='space-y-6 p-6'>
            <div className='flex flex-col gap-4 md:flex-row'>
              <div className='relative flex-1'>
                <Input
                  placeholder='Enter a keyword (e.g., "Future of Energy")'
                  value={searchTopic}
                  onChange={(e) => setSearchTopic(e.target.value)}
                  className='bg-background focus-visible:border-primary/50 h-14 border-2 pl-12 text-lg shadow-sm transition-all'
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTopic.trim())
                      handleGenerateArticle();
                  }}
                />
                <SearchIcon className='text-muted-foreground absolute top-1/2 left-4 size-5 -translate-y-1/2' />
              </div>
              <Button
                onClick={() => handleGenerateArticle()}
                disabled={isGenerating}
                className='shadow-primary/20 h-14 gap-2 px-8 text-lg font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]'
              >
                {isGenerating ? (
                  <>
                    <Loader2Icon className='size-5 animate-spin' />
                    Crafting...
                  </>
                ) : (
                  <>
                    <SparklesIcon className='size-5 animate-pulse text-yellow-400' />
                    {searchTopic ? 'Generate Custom' : 'Explore Current Trends'}
                  </>
                )}
              </Button>
            </div>

            <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
              <div className='space-y-3'>
                <div className='text-muted-foreground flex items-center justify-between text-xs font-bold tracking-[0.2em] uppercase'>
                  <div className='flex items-center gap-2'>
                    <TrendingUpIcon className='size-4' />
                    Your Interests
                  </div>
                </div>

                <div className='flex flex-wrap gap-2'>
                  {managedInterests.map((interest) => (
                    <div key={interest.id} className='group relative'>
                      <Badge
                        variant='outline'
                        className='bg-background hover:bg-primary/5 border-primary/20 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-all'
                      >
                        <span
                          className='cursor-pointer'
                          onClick={() => handleGenerateArticle(interest.name)}
                        >
                          {interest.name}
                        </span>
                        <button
                          onClick={() => handleDeleteInterest(interest.id)}
                          className='text-muted-foreground hover:text-destructive underline decoration-dotted transition-colors'
                        >
                          <XIcon className='size-3' />
                        </button>
                      </Badge>
                    </div>
                  ))}

                  <div className='flex items-center gap-2'>
                    <Input
                      placeholder='Add interest...'
                      value={newInterestInput}
                      onChange={(e) => setNewInterestInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddInterest();
                      }}
                      className='h-9 w-32 text-xs'
                    />
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={handleAddInterest}
                      disabled={isAddingInterest || !newInterestInput.trim()}
                      className='h-9 w-9 border border-dashed'
                    >
                      {isAddingInterest ? (
                        <Loader2Icon className='size-4 animate-spin' />
                      ) : (
                        <PlusIcon className='size-4' />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className='space-y-3'>
                <div className='text-muted-foreground flex items-center justify-between text-xs font-bold tracking-[0.2em] uppercase'>
                  <div className='flex items-center gap-2'>
                    <GlobeIcon className='size-4' />
                    Global Trends
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={handleFetchGlobalTrends}
                    disabled={isFetchingTrends}
                    className='h-6 gap-1 px-2 text-[10px]'
                  >
                    {isFetchingTrends ? (
                      <Loader2Icon className='size-3 animate-spin' />
                    ) : (
                      <SparklesIcon className='size-3' />
                    )}
                    Suggest Top 3
                  </Button>
                </div>
                <div className='flex flex-wrap gap-3'>
                  {globalTrends.length > 0 ? (
                    globalTrends.map((topic) => (
                      <HoverBorderGradient
                        key={topic}
                        onClick={() => handleGenerateArticle(topic)}
                        disabled={isGenerating}
                        className='bg-background flex items-center justify-center p-0'
                        containerClassName={cn(
                          'h-10',
                          isGenerating && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <span className='text-foreground dark:text-foreground/90 px-4 py-2 text-sm font-medium'>
                          {topic}
                        </span>
                      </HoverBorderGradient>
                    ))
                  ) : (
                    <div className='text-muted-foreground py-2 text-xs italic'>
                      {isFetchingTrends
                        ? 'Fetching latest trends...'
                        : "Click above to see what's trending globally..."}
                    </div>
                  )}
                </div>
              </div>

              {personalTopics.length > 0 && (
                <div className='space-y-3'>
                  <div className='text-primary flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase'>
                    <SparklesIcon className='size-4' />
                    Suggested from Lists
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {personalTopics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => handleGenerateArticle(topic, true)}
                        disabled={isGenerating}
                        className='group relative'
                      >
                        <Badge
                          variant='outline'
                          className='border-primary/30 bg-primary/5 hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-all'
                        >
                          {topic}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='space-y-8'>
        <div className='flex items-center gap-4'>
          <div className='bg-border h-px flex-1' />
          <h3 className='text-muted-foreground text-xs font-bold tracking-[0.3em] uppercase'>
            Latest Insights
          </h3>
          <div className='bg-border h-px flex-1' />
        </div>
      </div>

      {articles.length === 0 ? (
        <Card className='flex flex-col items-center justify-center border-dashed py-24 text-center'>
          <div className='bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full'>
            <NewspaperIcon className='size-8' />
          </div>
          <CardTitle className='text-xl'>No articles yet</CardTitle>
          <p className='text-muted-foreground mt-2 max-w-sm'>
            Generate your first article based on your interests or search for a
            custom topic above.
          </p>
          <Button
            className='mt-6'
            variant='outline'
            onClick={() => handleGenerateArticle()}
            disabled={isGenerating}
          >
            Generate First Article
          </Button>
        </Card>
      ) : (
        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {articles.map((article) => (
            <Card
              key={article.id}
              className='group flex h-full flex-col overflow-hidden transition-all hover:shadow-xl'
            >
              <CardHeader className='pb-3'>
                <div className='mb-3 flex items-start justify-between gap-4'>
                  <div className='flex flex-wrap gap-2 overflow-hidden'>
                    <Badge
                      variant='secondary'
                      className='bg-primary/10 text-primary hover:bg-primary/20 max-w-[180px] truncate px-2 py-0.5 text-[9px] tracking-widest uppercase transition-colors'
                    >
                      {article.topic || 'Trending'}
                    </Badge>
                    {article.isPublic === 'false' && (
                      <Badge
                        variant='outline'
                        className='border-yellow-500/50 px-2 py-0.5 text-[9px] tracking-widest text-yellow-600 uppercase dark:text-yellow-400'
                      >
                        Private
                      </Badge>
                    )}
                  </div>
                  <div className='text-muted-foreground shrink-0 pt-1 text-[9px] font-bold tracking-wider whitespace-nowrap uppercase'>
                    <time dateTime={article.createdAt.toISOString()}>
                      {formatDistanceToNow(article.createdAt, {
                        addSuffix: true
                      })}
                    </time>
                  </div>
                </div>
                <Link
                  href={`/articles/${article.id}`}
                  className='hover:text-primary transition-colors'
                >
                  <CardTitle className='line-clamp-2 text-xl leading-tight'>
                    {article.title}
                  </CardTitle>
                </Link>
              </CardHeader>
              <CardContent className='flex-1 pb-6'>
                <p className='text-muted-foreground line-clamp-4 text-sm leading-relaxed'>
                  {article.summary}
                </p>
              </CardContent>
              <CardFooter className='bg-muted/5 flex justify-between gap-2 overflow-hidden border-t p-4'>
                <div className='flex gap-2 overflow-hidden'>
                  <Button
                    variant='outline'
                    size='sm'
                    asChild
                    className='h-8 shrink-0 gap-1'
                  >
                    <Link href={`/articles/${article.id}`}>
                      <BookOpenIcon className='size-3.5' /> Read
                    </Link>
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='text-muted-foreground hover:text-primary h-8 w-8 shrink-0'
                    onClick={() => handleShare(article.id, article.title)}
                    title='Share'
                  >
                    <Share2Icon className='size-4' />
                  </Button>
                  {article.userId === user?.id && (
                    <Button
                      variant='ghost'
                      size='icon'
                      className={`h-8 w-8 shrink-0 ${article.isPublic === 'true' ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                      onClick={() =>
                        handleTogglePublic(
                          article.id,
                          article.isPublic === 'false'
                        )
                      }
                      title={
                        article.isPublic === 'true' ? 'Make Private' : 'Publish'
                      }
                    >
                      <GlobeIcon
                        className={`size-4 transition-all ${
                          article.isPublic === 'true'
                            ? 'text-primary'
                            : 'opacity-20'
                        }`}
                      />
                    </Button>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='text-muted-foreground hover:text-destructive ml-auto h-8 w-8 shrink-0'
                      title='Delete'
                    >
                      <Trash2Icon className='size-4' />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete your article.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteArticle(article.id)}
                        className='bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all hover:scale-[1.02] active:scale-[0.98]'
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
