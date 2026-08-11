'use client';

import { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  PlusIcon,
  SparklesIcon,
  Loader2Icon,
  BookOpenIcon,
  Share2Icon,
  Trash2Icon,
  NewspaperIcon,
  SearchIcon,
  TrendingUpIcon,
  GlobeIcon,
  LockIcon,
  XIcon,
  ServerIcon,
  ShuffleIcon,
  TrophyIcon,
  RefreshCwIcon,
  CheckCircle2Icon,
  LayoutGridIcon,
  ListIcon,
  SlidersHorizontalIcon,
  ZapIcon,
  BanIcon,
  AlertCircleIcon,
  SettingsIcon,
  CheckIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';
import {
  generateArticleAction,
  generateSystemDesignAction,
  generateTierRankingAction,
  deleteArticleAction,
  toggleArticlePublicAction,
  addInterestAction,
  deleteInterestAction,
  refreshTierArticleAction,
  markTierArticleReviewedAction
} from '../actions';
import { SYSTEM_DESIGN_SYSTEMS } from '../constants';
import { useFeedPreferencesStore } from '../store';
import { getTierFreshness, needsReview } from '../utils/tier-status';
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

const TIER_RANKING_EXAMPLES = [
  'Best 5 phones with longest battery life',
  'Best 5 budget foods under SGD 15 in Suntec City',
  'Top 5 free productivity apps for remote workers',
  'Best 5 programming languages to learn in 2025'
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
  seriesType: string | null;
  tierQuery: string | null;
  lastValidatedAt: Date | null;
  lastChangedAt: Date | null;
  updateSummary: string | null;
  reviewedAt: Date | null;
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

/** Compact freshness pill for ranked lists — the review cue lives here. */
function TierStatusBadge({ article }: { article: Article }) {
  const status = getTierFreshness(article);
  const base = 'gap-1 px-2 py-0.5 text-[9px] tracking-widest uppercase';

  if (status === 'needs-review') {
    return (
      <Badge
        variant='outline'
        className={cn(
          base,
          'border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400'
        )}
        title={article.updateSummary ?? 'The rankings changed — review them'}
      >
        <AlertCircleIcon className='size-2.5' /> Updated · review
      </Badge>
    );
  }

  if (status === 'checked-today') {
    return (
      <Badge
        variant='outline'
        className={cn(
          base,
          'border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
        )}
      >
        <CheckCircle2Icon className='size-2.5' /> Up to date
      </Badge>
    );
  }

  return (
    <Badge
      variant='outline'
      className={cn(
        base,
        'border-slate-400/50 text-slate-500 dark:text-slate-400'
      )}
    >
      <RefreshCwIcon className='size-2.5' />
      {article.lastValidatedAt
        ? formatDistanceToNow(new Date(article.lastValidatedAt), {
            addSuffix: true
          })
        : 'Never checked'}
    </Badge>
  );
}

export function ArticlesView({
  initialArticles,
  initialTopics,
  initialInterests
}: ArticlesViewProps) {
  const { user } = useUser();
  const {
    autoGenerateEnabled,
    blocklist,
    weights,
    setAutoGenerate,
    addToBlocklist,
    removeFromBlocklist,
    setWeights
  } = useFeedPreferencesStore();

  // Generation state
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [isGenerating, setIsGenerating] = useState(false);
  const [personalTopics] = useState<string[]>(initialTopics);
  const [managedInterests, setManagedInterests] = useState<UserInterest[]>(
    initialInterests || []
  );
  const [isGeneratingSystemDesign, setIsGeneratingSystemDesign] =
    useState(false);
  const [tierQuery, setTierQuery] = useState('');
  const [isGeneratingTier, setIsGeneratingTier] = useState(false);

  // Ranked list maintenance
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Interests / preferences state
  const [activeTab, setActiveTab] = useState('interests');
  const [isManagingInterests, setIsManagingInterests] = useState(false);
  const [newInterestInput, setNewInterestInput] = useState('');
  const [isAddingInterest, setIsAddingInterest] = useState(false);
  const [newBlocklistInput, setNewBlocklistInput] = useState('');

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const myTierArticles = articles.filter(
    (a) => a.seriesType === 'tier' && a.userId === user?.id
  );
  const tierArticlesNeedingReview = myTierArticles.filter(needsReview);

  const handleGenerateArticle = async (
    selectedTopic?: string,
    isPersonal = false
  ) => {
    setIsGenerating(true);
    const toastId = toast.loading(
      selectedTopic
        ? `Generating content about "${selectedTopic}"...`
        : 'Generating a new article from your interests...'
    );
    try {
      const newArticle = await generateArticleAction(selectedTopic, isPersonal);
      setArticles((prev) => [newArticle as Article, ...prev]);
      toast.success(
        isPersonal
          ? 'Successfully generated a private article!'
          : 'Successfully generated a new article!',
        { id: toastId }
      );
    } catch {
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
    } catch {
      toast.error('Failed to delete article');
    }
  };

  const handleShare = (id: string, title: string) => {
    const url = `${window.location.origin}/articles/${id}`;
    if (navigator.share) {
      navigator
        .share({ title, text: `Check out this article: ${title}`, url })
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
    } catch {
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
    } catch {
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
    } catch {
      toast.error('Failed to remove interest');
    }
  };

  const handleGenerateSystemDesign = async (system?: string) => {
    setIsGeneratingSystemDesign(true);
    const toastId = toast.loading(
      system ? `Designing ${system}...` : 'Picking a random system to design...'
    );
    try {
      const newArticle = await generateSystemDesignAction(system);
      setArticles((prev) => [newArticle as Article, ...prev]);
      toast.success(`System design for "${newArticle.title}" is ready!`, {
        id: toastId
      });
    } catch {
      toast.error('Failed to generate system design. Please try again.', {
        id: toastId
      });
    } finally {
      setIsGeneratingSystemDesign(false);
    }
  };

  const handleGenerateTierRanking = async (query?: string) => {
    const q = query || tierQuery;
    if (!q.trim()) return;
    setIsGeneratingTier(true);
    const toastId = toast.loading(`Building ranked list for "${q}"...`);
    try {
      const newArticle = await generateTierRankingAction(q.trim());
      setArticles((prev) => [newArticle as Article, ...prev]);
      setTierQuery('');
      toast.success(`Ranked list "${newArticle.title}" is ready!`, {
        id: toastId
      });
    } catch {
      toast.error('Failed to generate ranked list. Please try again.', {
        id: toastId
      });
    } finally {
      setIsGeneratingTier(false);
    }
  };

  const handleRefreshTier = async (id: string) => {
    setRefreshingId(id);
    const toastId = toast.loading('Checking this list against today...');
    try {
      const { article: updated, hasChanged } =
        await refreshTierArticleAction(id);
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? (updated as Article) : a))
      );
      toast.success(
        hasChanged
          ? 'The rankings changed — give it a review.'
          : 'Still accurate. Nothing changed.',
        { id: toastId }
      );
    } catch {
      toast.error('Failed to check this list. Please try again.', {
        id: toastId
      });
    } finally {
      setRefreshingId(null);
    }
  };

  const handleMarkReviewed = async (id: string) => {
    setReviewingId(id);
    try {
      const updated = await markTierArticleReviewedAction(id);
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? (updated as Article) : a))
      );
      toast.success('Marked as reviewed');
    } catch {
      toast.error('Failed to mark as reviewed');
    } finally {
      setReviewingId(null);
    }
  };

  const ArticleDeleteDialog = ({ article }: { article: Article }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='text-muted-foreground hover:text-destructive h-8 w-8 shrink-0'
          title='Delete'
        >
          <Trash2Icon className='size-4' />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this article?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            article.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleDeleteArticle(article.id)}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className='space-y-8 overflow-x-hidden pb-20'>
      {/* Header */}
      <div className='space-y-1'>
        <h2 className='text-2xl font-bold tracking-tight sm:text-3xl md:text-5xl'>
          Daily Intelligence
        </h2>
        <p className='text-muted-foreground text-base md:text-xl'>
          AI-curated insights on the trends that shape our future.
        </p>
      </div>

      {/* Unified workspace: explore interests, build ranked lists, tune the feed */}
      <Card className='border-primary/10 bg-muted/20 overflow-hidden border-2 shadow-lg backdrop-blur-sm'>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className='border-b px-3 pt-3 sm:px-6 sm:pt-4'>
            <TabsList className='h-9 w-full gap-1 bg-transparent p-0'>
              <TabsTrigger
                value='interests'
                className='data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md px-2 py-1.5 text-sm font-medium sm:px-4'
              >
                <SparklesIcon className='size-3.5 sm:mr-1.5' />
                <span className='hidden sm:inline'>Your Interests</span>
              </TabsTrigger>
              <TabsTrigger
                value='tier'
                className='data-[state=active]:bg-primary/10 data-[state=active]:text-primary relative rounded-md px-2 py-1.5 text-sm font-medium sm:px-4'
              >
                <TrophyIcon className='size-3.5 sm:mr-1.5' />
                <span className='hidden sm:inline'>Ranked Lists</span>
                {tierArticlesNeedingReview.length > 0 && (
                  <span className='ml-1.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white'>
                    {tierArticlesNeedingReview.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value='system-design'
                className='data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md px-2 py-1.5 text-sm font-medium sm:px-4'
              >
                <ServerIcon className='size-3.5 sm:mr-1.5' />
                <span className='hidden sm:inline'>System Design</span>
              </TabsTrigger>
              <TabsTrigger
                value='preferences'
                className='data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md px-2 py-1.5 text-sm font-medium sm:px-4'
              >
                <SlidersHorizontalIcon className='size-3.5 sm:mr-1.5' />
                <span className='hidden sm:inline'>Preferences</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Interests tab — explore and manage what you care about */}
          <TabsContent value='interests' className='mt-0'>
            <CardContent className='space-y-5 p-4 sm:p-6'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <p className='text-muted-foreground max-w-xl text-sm leading-relaxed'>
                  Tap an interest to generate a fresh article on it. Everything
                  here also feeds the daily auto-generated content.
                </p>
                <Button
                  variant={isManagingInterests ? 'secondary' : 'outline'}
                  size='sm'
                  className='shrink-0 gap-2'
                  onClick={() => setIsManagingInterests((v) => !v)}
                >
                  {isManagingInterests ? (
                    <>
                      <CheckIcon className='size-3.5' /> Done
                    </>
                  ) : (
                    <>
                      <SettingsIcon className='size-3.5' /> Manage
                    </>
                  )}
                </Button>
              </div>

              <div className='space-y-2'>
                <p className='text-muted-foreground flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] uppercase'>
                  <TrendingUpIcon className='size-3.5' /> Your Interests
                </p>
                <div className='flex flex-wrap items-center gap-2'>
                  {managedInterests.map((interest) =>
                    isManagingInterests ? (
                      <Badge
                        key={interest.id}
                        variant='outline'
                        className='bg-background border-primary/20 flex max-w-[240px] items-center gap-2 rounded-full px-3 py-1 text-sm font-medium'
                      >
                        <span className='truncate'>{interest.name}</span>
                        <button
                          onClick={() => handleDeleteInterest(interest.id)}
                          className='text-muted-foreground hover:text-destructive shrink-0 transition-colors'
                          title='Remove interest'
                        >
                          <XIcon className='size-3' />
                        </button>
                      </Badge>
                    ) : (
                      <button
                        key={interest.id}
                        onClick={() => handleGenerateArticle(interest.name)}
                        disabled={isGenerating}
                        className='group'
                        title={`Generate an article on "${interest.name}"`}
                      >
                        <Badge
                          variant='outline'
                          className='bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary border-primary/20 max-w-[240px] cursor-pointer rounded-full px-3 py-1 text-sm font-medium shadow-sm transition-all group-disabled:cursor-not-allowed group-disabled:opacity-50'
                        >
                          <span className='truncate'>{interest.name}</span>
                        </Badge>
                      </button>
                    )
                  )}

                  <div className='flex items-center gap-2'>
                    <Input
                      placeholder='Add an interest...'
                      value={newInterestInput}
                      onChange={(e) => setNewInterestInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddInterest();
                      }}
                      className='h-8 w-40 text-xs'
                    />
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={handleAddInterest}
                      disabled={isAddingInterest || !newInterestInput.trim()}
                      className='h-8 w-8 border border-dashed'
                      title='Add interest'
                    >
                      {isAddingInterest ? (
                        <Loader2Icon className='size-3.5 animate-spin' />
                      ) : (
                        <PlusIcon className='size-3.5' />
                      )}
                    </Button>
                  </div>
                </div>
                {managedInterests.length === 0 && (
                  <p className='text-muted-foreground py-1 text-xs italic'>
                    Add your first interest to start shaping your feed.
                  </p>
                )}
              </div>

              {personalTopics.length > 0 && (
                <div className='space-y-2'>
                  <p className='text-primary flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] uppercase'>
                    <SparklesIcon className='size-3.5' /> Suggested from Lists
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    {personalTopics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => handleGenerateArticle(topic, true)}
                        disabled={isGenerating}
                        className='group'
                      >
                        <Badge
                          variant='outline'
                          className='border-primary/30 bg-primary/5 hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer rounded-full px-3 py-1 text-sm font-medium transition-all group-disabled:cursor-not-allowed group-disabled:opacity-50'
                        >
                          {topic}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isGenerating && (
                <p className='text-muted-foreground flex items-center gap-2 text-xs'>
                  <Loader2Icon className='size-3.5 animate-spin' /> Crafting
                  your article...
                </p>
              )}
            </CardContent>
          </TabsContent>

          {/* Ranked Lists tab — create lists and keep them current */}
          <TabsContent value='tier' className='mt-0'>
            <CardContent className='space-y-6 p-4 sm:p-6'>
              <div className='space-y-3'>
                <p className='text-muted-foreground text-sm leading-relaxed'>
                  Build a ranked list for anything you want compared. Each list
                  is re-checked daily — when the rankings actually move, it gets
                  flagged for your review.
                </p>
                <div className='flex flex-col gap-3 sm:flex-row'>
                  <div className='relative flex-1'>
                    <Input
                      placeholder='e.g. "Best 5 phones with longest battery life"'
                      value={tierQuery}
                      onChange={(e) => setTierQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tierQuery.trim())
                          handleGenerateTierRanking();
                      }}
                      className='bg-background focus-visible:border-primary/50 h-11 border-2 pl-10 shadow-sm transition-all'
                      disabled={isGeneratingTier}
                    />
                    <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
                  </div>
                  <Button
                    onClick={() => handleGenerateTierRanking()}
                    disabled={isGeneratingTier || !tierQuery.trim()}
                    className='h-11 gap-2 px-6 font-semibold'
                  >
                    {isGeneratingTier ? (
                      <>
                        <Loader2Icon className='size-4 animate-spin' />{' '}
                        Ranking...
                      </>
                    ) : (
                      <>
                        <TrophyIcon className='size-4' /> Generate Ranking
                      </>
                    )}
                  </Button>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {TIER_RANKING_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      onClick={() => handleGenerateTierRanking(example)}
                      disabled={isGeneratingTier}
                      className='group'
                    >
                      <Badge
                        variant='outline'
                        className='border-primary/30 bg-primary/5 hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all group-disabled:cursor-not-allowed group-disabled:opacity-50'
                      >
                        {example}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>

              {/* Your ranked lists, with freshness status */}
              {myTierArticles.length > 0 && (
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <p className='text-muted-foreground text-xs font-bold tracking-[0.2em] uppercase'>
                      Your Ranked Lists
                    </p>
                    {tierArticlesNeedingReview.length > 0 && (
                      <span className='text-xs font-medium text-amber-600 dark:text-amber-400'>
                        {tierArticlesNeedingReview.length} need
                        {tierArticlesNeedingReview.length === 1 ? 's' : ''}{' '}
                        review
                      </span>
                    )}
                  </div>
                  <div className='divide-y rounded-xl border'>
                    {myTierArticles.map((article) => (
                      <div
                        key={article.id}
                        className={cn(
                          'flex flex-wrap items-center gap-3 px-4 py-3 transition-colors',
                          needsReview(article) && 'bg-amber-500/5'
                        )}
                      >
                        <div className='min-w-0 flex-1'>
                          <Link
                            href={`/articles/${article.id}`}
                            className='hover:text-primary line-clamp-1 text-sm font-medium transition-colors'
                          >
                            {article.title}
                          </Link>
                          <div className='mt-1 flex flex-wrap items-center gap-2'>
                            <TierStatusBadge article={article} />
                            {needsReview(article) && article.updateSummary && (
                              <span className='text-muted-foreground line-clamp-1 text-[11px] italic'>
                                {article.updateSummary}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className='flex shrink-0 items-center gap-1'>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='text-muted-foreground hover:text-primary h-7 w-7'
                            onClick={() => handleRefreshTier(article.id)}
                            disabled={refreshingId === article.id}
                            title='Check if this list is still current'
                          >
                            {refreshingId === article.id ? (
                              <Loader2Icon className='size-3.5 animate-spin' />
                            ) : (
                              <RefreshCwIcon className='size-3.5' />
                            )}
                          </Button>
                          {needsReview(article) && (
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-7 gap-1 text-xs text-amber-600 dark:text-amber-400'
                              onClick={() => handleMarkReviewed(article.id)}
                              disabled={reviewingId === article.id}
                            >
                              {reviewingId === article.id ? (
                                <Loader2Icon className='size-3 animate-spin' />
                              ) : (
                                <CheckIcon className='size-3' />
                              )}
                              Reviewed
                            </Button>
                          )}
                          <Button
                            variant='outline'
                            size='sm'
                            asChild
                            className='h-7 gap-1 text-xs'
                          >
                            <Link href={`/articles/${article.id}`}>
                              <BookOpenIcon className='size-3' /> Open
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </TabsContent>

          {/* System Design tab */}
          <TabsContent value='system-design' className='mt-0'>
            <CardContent className='space-y-5 p-4 sm:p-6'>
              <div className='flex items-start justify-between gap-4'>
                <p className='text-muted-foreground text-sm leading-relaxed'>
                  Deep-dive breakdowns covering functional requirements,
                  non-functional requirements, database design, APIs, and
                  scalability — hellointerview.com style.
                </p>
                <Button
                  onClick={() => handleGenerateSystemDesign()}
                  disabled={isGeneratingSystemDesign}
                  variant='outline'
                  size='sm'
                  className='shrink-0 gap-2'
                >
                  {isGeneratingSystemDesign ? (
                    <Loader2Icon className='size-4 animate-spin' />
                  ) : (
                    <ShuffleIcon className='size-4' />
                  )}
                  Random
                </Button>
              </div>
              <div className='space-y-2'>
                <p className='text-muted-foreground text-xs font-bold tracking-[0.2em] uppercase'>
                  Pick a system
                </p>
                <div className='flex flex-wrap gap-2'>
                  {SYSTEM_DESIGN_SYSTEMS.map((system) => (
                    <button
                      key={system}
                      onClick={() => handleGenerateSystemDesign(system)}
                      disabled={isGeneratingSystemDesign}
                      className='group'
                    >
                      <Badge
                        variant='outline'
                        className='hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer rounded-full px-3 py-1 text-sm font-medium transition-all group-disabled:cursor-not-allowed group-disabled:opacity-50'
                      >
                        {system}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </TabsContent>

          {/* Preferences tab — control what gets auto-generated */}
          <TabsContent value='preferences' className='mt-0'>
            <CardContent className='space-y-7 p-4 sm:p-6'>
              <p className='text-muted-foreground text-sm leading-relaxed'>
                Control what gets auto-generated for your daily feed.
              </p>

              {/* Auto-generate toggle */}
              <div className='flex items-center justify-between rounded-lg border p-3'>
                <div className='space-y-0.5'>
                  <Label className='flex items-center gap-2 text-sm font-medium'>
                    <ZapIcon className='text-primary size-3.5' />
                    Auto-generate daily content
                  </Label>
                  <p className='text-muted-foreground text-xs'>
                    Automatically create new articles each day based on your
                    interests
                  </p>
                </div>
                <Switch
                  checked={autoGenerateEnabled}
                  onCheckedChange={setAutoGenerate}
                />
              </div>

              {/* Ranked list freshness overview */}
              <div className='space-y-2'>
                <p className='text-muted-foreground text-xs font-bold tracking-[0.2em] uppercase'>
                  Ranked List Freshness
                </p>
                {myTierArticles.length === 0 ? (
                  <p className='text-muted-foreground text-xs'>
                    You have no ranked lists yet. Create one from the{' '}
                    <button
                      className='text-primary underline underline-offset-2'
                      onClick={() => setActiveTab('tier')}
                    >
                      Ranked Lists
                    </button>{' '}
                    tab and it will be re-checked daily.
                  </p>
                ) : (
                  <div className='flex flex-wrap items-center gap-3 rounded-lg border p-3'>
                    <div className='flex-1 text-xs'>
                      <p className='font-medium'>
                        {myTierArticles.length} list
                        {myTierArticles.length === 1 ? '' : 's'} tracked daily
                      </p>
                      <p className='text-muted-foreground mt-0.5'>
                        {tierArticlesNeedingReview.length > 0 ? (
                          <span className='text-amber-600 dark:text-amber-400'>
                            {tierArticlesNeedingReview.length} changed since you
                            last looked
                          </span>
                        ) : (
                          'All lists are current — nothing to review'
                        )}
                      </p>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-7 gap-1 text-xs'
                      onClick={() => setActiveTab('tier')}
                    >
                      <TrophyIcon className='size-3' /> Review lists
                    </Button>
                  </div>
                )}
              </div>

              {/* Source weights */}
              <div className='space-y-4'>
                <div>
                  <p className='text-muted-foreground text-xs font-bold tracking-[0.2em] uppercase'>
                    Source Weights
                  </p>
                  <p className='text-muted-foreground mt-0.5 text-xs'>
                    Tune how much each source influences auto-generated content.
                  </p>
                </div>
                <div className='space-y-5'>
                  {(
                    [
                      {
                        key: 'interests' as const,
                        label: 'Your Interests',
                        icon: <TrendingUpIcon className='size-3.5' />
                      },
                      {
                        key: 'trends' as const,
                        label: 'Global Trends',
                        icon: <GlobeIcon className='size-3.5' />
                      },
                      {
                        key: 'lists' as const,
                        label: 'From Your Lists',
                        icon: <SparklesIcon className='size-3.5' />
                      }
                    ] as const
                  ).map(({ key, label, icon }) => (
                    <div key={key} className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <Label className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
                          {icon} {label}
                        </Label>
                        <span className='text-muted-foreground w-8 text-right text-xs tabular-nums'>
                          {weights[key]}%
                        </span>
                      </div>
                      <Slider
                        value={[weights[key]]}
                        onValueChange={([v]) => setWeights({ [key]: v })}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Blocklist */}
              <div className='space-y-3'>
                <div>
                  <p className='text-muted-foreground text-xs font-bold tracking-[0.2em] uppercase'>
                    Topic Blocklist
                  </p>
                  <p className='text-muted-foreground mt-0.5 text-xs'>
                    Topics you never want generated in your feed.
                  </p>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {blocklist.map((item) => (
                    <Badge
                      key={item.id}
                      variant='outline'
                      className='border-destructive/30 bg-destructive/5 flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium'
                    >
                      <BanIcon className='text-destructive/60 size-3 shrink-0' />
                      {item.topic}
                      <button
                        onClick={() => removeFromBlocklist(item.id)}
                        className='text-muted-foreground hover:text-destructive transition-colors'
                      >
                        <XIcon className='size-3' />
                      </button>
                    </Badge>
                  ))}
                  <div className='flex items-center gap-2'>
                    <Input
                      placeholder='Block a topic...'
                      value={newBlocklistInput}
                      onChange={(e) => setNewBlocklistInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newBlocklistInput.trim()) {
                          addToBlocklist(newBlocklistInput.trim());
                          setNewBlocklistInput('');
                        }
                      }}
                      className='h-8 w-36 text-xs'
                    />
                    <Button
                      variant='ghost'
                      size='icon'
                      disabled={!newBlocklistInput.trim()}
                      onClick={() => {
                        if (newBlocklistInput.trim()) {
                          addToBlocklist(newBlocklistInput.trim());
                          setNewBlocklistInput('');
                        }
                      }}
                      className='h-8 w-8 border border-dashed'
                    >
                      <PlusIcon className='size-3.5' />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Latest Insights header with view toggle */}
      <div className='flex items-center gap-3'>
        <div className='bg-border h-px flex-1' />
        <h3 className='text-muted-foreground text-xs font-bold tracking-[0.3em] uppercase'>
          Latest Insights
        </h3>
        <div className='bg-border h-px flex-1' />
        <div className='flex items-center gap-0.5 rounded-lg border p-0.5'>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size='icon'
            className='h-6 w-6'
            onClick={() => setViewMode('grid')}
            title='Grid view'
          >
            <LayoutGridIcon className='size-3.5' />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size='icon'
            className='h-6 w-6'
            onClick={() => setViewMode('list')}
            title='List view'
          >
            <ListIcon className='size-3.5' />
          </Button>
        </div>
      </div>

      {/* Articles */}
      {articles.length === 0 ? (
        <Card className='flex flex-col items-center justify-center border-dashed py-24 text-center'>
          <div className='bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full'>
            <NewspaperIcon className='size-8' />
          </div>
          <CardTitle className='text-xl'>No articles yet</CardTitle>
          <p className='text-muted-foreground mt-2 max-w-sm'>
            Generate your first article from one of your interests, or build a
            ranked list above.
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
      ) : viewMode === 'grid' ? (
        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {articles.map((article) => (
            <Card
              key={article.id}
              className={cn(
                'group flex h-full flex-col overflow-hidden transition-all hover:shadow-xl',
                needsReview(article) && 'border-amber-500/40'
              )}
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
                    {article.seriesType === 'tier' && (
                      <TierStatusBadge article={article} />
                    )}
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
                {needsReview(article) && article.updateSummary && (
                  <p className='mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs leading-snug text-amber-800 dark:text-amber-300'>
                    {article.updateSummary}
                  </p>
                )}
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
                      className='h-8 w-8 shrink-0'
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
                        className={cn(
                          'size-4 transition-all',
                          article.isPublic === 'true'
                            ? 'text-primary'
                            : 'text-muted-foreground opacity-30'
                        )}
                      />
                    </Button>
                  )}
                </div>
                <ArticleDeleteDialog article={article} />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        /* List view */
        <div className='divide-y rounded-xl border'>
          {articles.map((article) => (
            <div
              key={article.id}
              className={cn(
                'hover:bg-muted/30 flex items-center gap-4 px-4 py-3 transition-colors',
                needsReview(article) && 'bg-amber-500/5'
              )}
            >
              <div className='min-w-0 flex-1'>
                <Link
                  href={`/articles/${article.id}`}
                  className='hover:text-primary line-clamp-1 text-sm font-medium transition-colors'
                >
                  {article.title}
                </Link>
                <div className='mt-1 flex flex-wrap items-center gap-2'>
                  {article.topic && (
                    <Badge
                      variant='secondary'
                      className='bg-primary/10 text-primary px-2 py-0 text-[9px] tracking-widest uppercase'
                    >
                      {article.topic}
                    </Badge>
                  )}
                  {article.seriesType === 'tier' && (
                    <TierStatusBadge article={article} />
                  )}
                  {article.isPublic === 'false' && (
                    <Badge
                      variant='outline'
                      className='border-yellow-500/50 px-2 py-0 text-[9px] tracking-widest text-yellow-600 uppercase dark:text-yellow-400'
                    >
                      Private
                    </Badge>
                  )}
                  <span className='text-muted-foreground text-[10px]'>
                    {formatDistanceToNow(article.createdAt, {
                      addSuffix: true
                    })}
                  </span>
                </div>
              </div>
              <div className='flex shrink-0 items-center gap-1'>
                <Button
                  variant='outline'
                  size='sm'
                  asChild
                  className='h-7 gap-1 text-xs'
                >
                  <Link href={`/articles/${article.id}`}>
                    <BookOpenIcon className='size-3' /> Read
                  </Link>
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  className='text-muted-foreground hover:text-primary h-7 w-7'
                  onClick={() => handleShare(article.id, article.title)}
                  title='Share'
                >
                  <Share2Icon className='size-3.5' />
                </Button>
                {article.userId === user?.id && (
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7'
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
                    {article.isPublic === 'true' ? (
                      <GlobeIcon className='text-primary size-3.5' />
                    ) : (
                      <LockIcon className='text-muted-foreground size-3.5 opacity-40' />
                    )}
                  </Button>
                )}
                <ArticleDeleteDialog article={article} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
