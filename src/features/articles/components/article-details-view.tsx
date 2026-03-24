'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeftIcon,
  Share2Icon,
  CalendarIcon,
  ClockIcon,
  GlobeIcon,
  LockIcon,
  BookOpenIcon,
  SparklesIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { toggleArticlePublicAction } from '../actions';
import Link from 'next/link';
import { format } from 'date-fns';

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

interface ArticleDetailsViewProps {
  article: Article;
  isOwner?: boolean; // If we add user auth to articles
}

export function ArticleDetailsView({
  article: initialArticle,
  isOwner = true
}: ArticleDetailsViewProps) {
  const [article, setArticle] = useState<Article>(initialArticle);
  const [isUpdating, setIsUpdating] = useState(false);

  const togglePublic = async () => {
    setIsUpdating(true);
    try {
      const newStatus = article.isPublic !== 'true';
      await toggleArticlePublicAction(article.id, newStatus);
      setArticle((prev) => ({
        ...prev,
        isPublic: newStatus ? 'true' : 'false'
      }));
      toast.success(
        newStatus ? 'Article is now public' : 'Article is now private'
      );
    } catch (e) {
      toast.error('Failed to update visibility');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator
        .share({
          title: article.title,
          text: article.summary || article.title,
          url
        })
        .catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  // Simple markdown-to-structured-HTML fallback
  const renderContent = (content: string) => {
    const processLine = (line: string) => {
      return line.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('[') && part.includes('](')) {
          const match = part.match(/\[(.*?)\]\((.*?)\)/);
          if (match) {
            return (
              <a
                key={j}
                href={match[2]}
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary font-medium hover:underline'
              >
                {match[1]}
              </a>
            );
          }
        }
        return part;
      });
    };

    return content.split('\n').map((line, i) => {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('# ')) {
        return (
          <h1 key={i} className='text-foreground mt-10 mb-6 text-3xl font-bold'>
            {line.substring(2)}
          </h1>
        );
      }
      if (trimmedLine.startsWith('## ')) {
        return (
          <h2
            key={i}
            className='text-foreground/90 mt-8 mb-4 text-2xl font-bold'
          >
            {line.substring(3)}
          </h2>
        );
      }
      if (trimmedLine.startsWith('### ')) {
        return (
          <h3
            key={i}
            className='text-foreground/80 mt-6 mb-3 text-xl font-bold'
          >
            {line.substring(4)}
          </h3>
        );
      }
      if (trimmedLine === '') {
        return <div key={i} className='h-6' />;
      }
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        // Strip the bullet marker and process the rest
        const bulletContent = line.trim().substring(2);
        return (
          <li
            key={i}
            className='text-muted-foreground mb-3 ml-6 list-disc pl-2 leading-relaxed md:text-lg'
          >
            {processLine(bulletContent)}
          </li>
        );
      }

      return (
        <p
          key={i}
          className='text-muted-foreground mb-6 leading-relaxed md:text-lg'
        >
          {processLine(line)}
        </p>
      );
    });
  };

  return (
    <div className='mx-auto max-w-4xl space-y-8 pb-20'>
      <div className='flex items-center justify-between'>
        <Button
          variant='ghost'
          size='sm'
          asChild
          className='text-muted-foreground hover:text-primary -ml-2 gap-2'
        >
          <Link href='/articles'>
            <ArrowLeftIcon className='size-4' /> Back to Daily Feed
          </Link>
        </Button>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='shrink-0 gap-2'
            onClick={handleShare}
          >
            <Share2Icon className='size-4' /> Share
          </Button>
          {isOwner && (
            <Button
              variant={article.isPublic === 'true' ? 'secondary' : 'default'}
              size='sm'
              className='shrink-0 gap-2'
              onClick={togglePublic}
              disabled={isUpdating}
            >
              {article.isPublic === 'true' ? (
                <>
                  <GlobeIcon className='size-4' /> Public
                </>
              ) : (
                <>
                  <LockIcon className='size-4' /> Private
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <header className='space-y-4 text-center'>
        <div className='flex items-center justify-center gap-3'>
          <Badge
            variant='secondary'
            className='bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 text-[10px] tracking-widest uppercase transition-colors'
          >
            {article.topic || 'Trending Insight'}
          </Badge>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
            <ClockIcon className='size-3.5' /> 2 min read
          </div>
        </div>
        <h1 className='text-4xl leading-tight font-extrabold tracking-tight text-balance md:text-5xl lg:text-6xl'>
          {article.title}
        </h1>
        <div className='text-muted-foreground flex items-center justify-center gap-4 pt-4 text-sm font-medium'>
          <div className='flex items-center gap-2'>
            <div className='bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full font-bold shadow-sm'>
              <SparklesIcon className='size-4' />
            </div>
            <span>AI Daily</span>
          </div>
          <span className='opacity-30'>|</span>
          <div className='flex items-center gap-1.5'>
            <CalendarIcon className='size-4' />
            {format(article.createdAt, 'MMMM d, yyyy')}
          </div>
        </div>
      </header>

      <article className='prose prose-neutral dark:prose-invert prose-lg max-w-none md:px-8'>
        {article.summary && (
          <div className='bg-muted/30 border-primary text-foreground mb-12 rounded-r-2xl border-l-4 p-6 text-xl leading-relaxed italic'>
            &ldquo;{article.summary}&rdquo;
          </div>
        )}
        <div className='article-content'>{renderContent(article.content)}</div>
      </article>

      <footer className='mt-20 space-y-6 border-t pt-12 text-center'>
        <div className='flex flex-col items-center gap-2'>
          <div className='bg-primary/5 rounded-full p-4'>
            <BookOpenIcon className='text-primary size-10 opacity-50' />
          </div>
          <h3 className='text-xl font-bold'>Enjoyed this read?</h3>
          <p className='text-muted-foreground max-w-md'>
            Our Daily Feed uses state-of-the-art AI to curate the most relevant
            and trending topics in real-time.
          </p>
        </div>
        <Button
          asChild
          size='lg'
          variant='outline'
          className='rounded-full px-8'
        >
          <Link href='/articles'>Read More Daily Insights</Link>
        </Button>
      </footer>
    </div>
  );
}
