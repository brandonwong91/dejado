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
  SparklesIcon,
  TrophyIcon,
  CheckCircle2Icon,
  RefreshCwIcon
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { toggleArticlePublicAction } from '../actions';
import Link from 'next/link';
import { format } from 'date-fns';
import { MermaidDiagram } from '@/components/ui/mermaid-diagram';

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
  createdAt: Date;
  updatedAt: Date;
}

interface ArticleDetailsViewProps {
  article: Article;
  isOwner?: boolean; // If we add user auth to articles
}

export function ArticleDetailsView({
  article: initialArticle,
  isOwner = false
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

  const renderContent = (rawContent: string) => {
    // Convert bare language labels (a line that is only e.g. "sql" or "mermaid")
    // to proper fenced code blocks, for LLM output that omits the backtick fences.
    // Terminates at the next ## heading, a blank line followed by a prose sentence,
    // or end of string.
    const content = rawContent.replace(
      /\n(sql|mermaid|javascript|typescript|python|bash|json|yaml|css|html|java|go|rust)\n([\s\S]*?)(?=\n## |\n\n[A-Z][a-z]|$)/gi,
      (_match, lang: string, code: string) =>
        `\n\`\`\`${lang}\n${code.trimEnd()}\n\`\`\`\n`
    );

    const processInline = (text: string, key: number) =>
      text.split(/(\*\*.*?\*\*|`[^`]+`|\[.*?\]\(.*?\))/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`'))
          return (
            <code
              key={j}
              className='bg-muted rounded px-1.5 py-0.5 font-mono text-sm'
            >
              {part.slice(1, -1)}
            </code>
          );
        if (part.startsWith('[') && part.includes('](')) {
          const m = part.match(/\[(.*?)\]\((.*?)\)/);
          if (m)
            return (
              <a
                key={j}
                href={m[2]}
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary font-medium hover:underline'
              >
                {m[1]}
              </a>
            );
        }
        return part;
      });

    // Split content into segments: code blocks vs plain text
    type Segment =
      | { type: 'mermaid'; code: string }
      | { type: 'code'; lang: string; code: string }
      | { type: 'text'; lines: string[] };

    const segments: Segment[] = [];
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim().toLowerCase();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // consume closing ```
        if (lang === 'mermaid') {
          const mermaidCode = codeLines
            .join('\n')
            // remove standalone "direction XY" — only valid inside subgraphs
            .replace(/^\s*direction\s+\w+\s*$/gm, '')
            // flatten newlines inside node labels [...] to a space
            .replace(/\[([^\]]*?)\n([^\]]*?)\]/g, '[$1 $2]')
            .trim();
          segments.push({ type: 'mermaid', code: mermaidCode });
        } else {
          segments.push({ type: 'code', lang, code: codeLines.join('\n') });
        }
      } else {
        // Accumulate plain text lines
        const last = segments[segments.length - 1];
        if (last?.type === 'text') {
          last.lines.push(lines[i]);
        } else {
          segments.push({ type: 'text', lines: [lines[i]] });
        }
        i++;
      }
    }

    return segments.map((seg, si) => {
      if (seg.type === 'mermaid') {
        return <MermaidDiagram key={si} chart={seg.code} />;
      }

      if (seg.type === 'code') {
        return (
          <pre
            key={si}
            className='bg-muted my-4 overflow-x-auto rounded-xl border p-4 font-mono text-sm leading-relaxed'
          >
            <code>{seg.code}</code>
          </pre>
        );
      }

      // Plain text lines
      return (
        <div key={si}>
          {seg.lines.map((line, li) => {
            const t = line.trim();
            if (t.startsWith('# '))
              return (
                <h1
                  key={li}
                  className='text-foreground mt-10 mb-6 text-3xl font-bold'
                >
                  {processInline(t.slice(2), li)}
                </h1>
              );
            if (t.startsWith('## '))
              return (
                <h2
                  key={li}
                  className='text-foreground/90 mt-8 mb-4 text-2xl font-bold'
                >
                  {processInline(t.slice(3), li)}
                </h2>
              );
            if (t.startsWith('### '))
              return (
                <h3
                  key={li}
                  className='text-foreground/80 mt-6 mb-3 text-xl font-bold'
                >
                  {processInline(t.slice(4), li)}
                </h3>
              );
            if (t === '') return <div key={li} className='h-4' />;
            if (t.startsWith('- ') || t.startsWith('* '))
              return (
                <li
                  key={li}
                  className='text-muted-foreground mb-3 ml-6 list-disc pl-2 leading-relaxed md:text-lg'
                >
                  {processInline(t.slice(2), li)}
                </li>
              );
            if (/^\d+\.\s/.test(t))
              return (
                <li
                  key={li}
                  className='text-muted-foreground mb-3 ml-6 list-decimal pl-2 leading-relaxed md:text-lg'
                >
                  {processInline(t.replace(/^\d+\.\s/, ''), li)}
                </li>
              );
            if (t.startsWith('> '))
              return (
                <blockquote
                  key={li}
                  className='border-primary/40 text-muted-foreground my-4 border-l-4 pl-4 italic'
                >
                  {processInline(t.slice(2), li)}
                </blockquote>
              );
            return (
              <p
                key={li}
                className='text-muted-foreground mb-6 leading-relaxed md:text-lg'
              >
                {processInline(line, li)}
              </p>
            );
          })}
        </div>
      );
    });
  };
  return (
    <div className='mx-auto w-full max-w-4xl space-y-8 overflow-x-hidden pb-20'>
      <div className='flex flex-wrap items-center justify-between gap-y-2'>
        <Button
          variant='ghost'
          size='sm'
          asChild
          className='text-muted-foreground hover:text-primary -ml-2 gap-2'
        >
          <Link href='/articles'>
            <ArrowLeftIcon className='size-4' />
            <span className='hidden sm:inline'>Back to Daily Feed</span>
          </Link>
        </Button>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='shrink-0 gap-2'
            onClick={handleShare}
          >
            <Share2Icon className='size-4' />
            <span className='hidden sm:inline'>Share</span>
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
                  <GlobeIcon className='size-4' />
                  <span className='hidden sm:inline'>Public</span>
                </>
              ) : (
                <>
                  <LockIcon className='size-4' />
                  <span className='hidden sm:inline'>Private</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <header className='space-y-4 text-center'>
        <div className='flex flex-wrap items-center justify-center gap-3'>
          <Badge
            variant='secondary'
            className='bg-primary/10 text-primary hover:bg-primary/20 max-w-[calc(100vw-3rem)] px-3 py-1 text-center text-[10px] tracking-wider break-words whitespace-normal uppercase transition-colors'
          >
            {article.topic || 'Trending Insight'}
          </Badge>
          {article.seriesType === 'tier' &&
            article.lastValidatedAt &&
            (() => {
              const hoursSinceValidation =
                (Date.now() - new Date(article.lastValidatedAt).getTime()) /
                (1000 * 60 * 60);
              return hoursSinceValidation < 24 ? (
                <Badge
                  variant='outline'
                  className='gap-1 border-emerald-500/50 px-3 py-1 text-[10px] tracking-wider text-emerald-600 uppercase dark:text-emerald-400'
                >
                  <CheckCircle2Icon className='size-3' />
                  List updated today
                </Badge>
              ) : (
                <Badge
                  variant='outline'
                  className='gap-1 border-slate-400/50 px-3 py-1 text-[10px] tracking-wider text-slate-500 uppercase dark:text-slate-400'
                >
                  <RefreshCwIcon className='size-3' />
                  Last checked{' '}
                  {formatDistanceToNow(new Date(article.lastValidatedAt), {
                    addSuffix: true
                  })}
                </Badge>
              );
            })()}
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
            <ClockIcon className='size-3.5' /> 2 min read
          </div>
        </div>
        <h1 className='text-2xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl md:text-5xl lg:text-6xl'>
          {article.title}
        </h1>
        {article.seriesType === 'tier' && article.tierQuery && (
          <div className='bg-muted/40 mx-auto flex max-w-xl items-center gap-2 rounded-full px-4 py-2 text-sm'>
            <TrophyIcon className='text-primary size-4 shrink-0' />
            <span className='text-muted-foreground italic'>
              &ldquo;{article.tierQuery}&rdquo;
            </span>
          </div>
        )}
        <div className='text-muted-foreground flex flex-wrap items-center justify-center gap-4 pt-4 text-sm font-medium'>
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
          {article.seriesType === 'tier' && (
            <>
              <span className='opacity-30'>|</span>
              <div className='flex items-center gap-1.5'>
                <RefreshCwIcon className='size-4' />
                Content last updated {format(article.updatedAt, 'MMMM d, yyyy')}
              </div>
            </>
          )}
        </div>
      </header>

      <article className='prose prose-neutral dark:prose-invert prose-lg max-w-none overflow-x-hidden md:px-8'>
        {article.summary && (
          <div className='bg-muted/30 border-primary text-foreground mb-12 rounded-r-2xl border-l-4 p-4 text-base leading-relaxed italic sm:p-6 sm:text-xl'>
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
