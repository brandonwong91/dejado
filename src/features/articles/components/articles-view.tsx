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
  TrendingUpIcon
} from 'lucide-react';
import { toast } from 'sonner';
import {
  generateArticleAction,
  deleteArticleAction,
  getArticlesAction
} from '../actions';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

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
  createdAt: Date;
}

interface ArticlesViewProps {
  initialArticles: Article[];
}

export function ArticlesView({ initialArticles }: ArticlesViewProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTopic, setSearchTopic] = useState('');

  const handleGenerateArticle = async (selectedTopic?: string) => {
    const topicToUse = selectedTopic || searchTopic;
    setIsGenerating(true);
    const toastId = toast.loading(
      topicToUse
        ? `Generating content about "${topicToUse}"...`
        : 'Generating a new article from trending topics...'
    );
    try {
      const newArticle = await generateArticleAction(topicToUse);
      setArticles((prev) => [newArticle, ...prev]);
      setSearchTopic('');
      toast.success('Successfully generated a new article!', { id: toastId });
    } catch (e) {
      toast.error('Failed to generate article. Please try again.', {
        id: toastId
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
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

        {/* Steering Generation UI */}
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
                    {searchTopic ? 'Generate Custom' : 'Explore Trending'}
                  </>
                )}
              </Button>
            </div>

            <div className='space-y-3'>
              <div className='text-muted-foreground flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase'>
                <TrendingUpIcon className='size-4' />
                Popular Suggestions
              </div>
              <div className='flex flex-wrap gap-2'>
                {SUGGESTED_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => handleGenerateArticle(topic)}
                    disabled={isGenerating}
                    className='group relative'
                  >
                    <Badge
                      variant='outline'
                      className='bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-all'
                    >
                      {topic}
                    </Badge>
                  </button>
                ))}
              </div>
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
            Generate your first article from today&apos;s trending topics or
            check back tomorrow for our daily update!
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
                <div className='mb-3 flex items-center justify-between'>
                  <Badge
                    variant='secondary'
                    className='bg-primary/10 text-primary hover:bg-primary/20 px-2 py-0.5 text-[9px] tracking-widest uppercase transition-colors'
                  >
                    {article.topic || 'Trending'}
                  </Badge>
                  <div className='text-muted-foreground flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase'>
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
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  className='text-muted-foreground hover:text-destructive ml-auto h-8 w-8 shrink-0'
                  onClick={() => handleDeleteArticle(article.id)}
                  title='Delete'
                >
                  <Trash2Icon className='size-4' />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
