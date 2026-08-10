'use client';

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
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import {
  deleteAllProfileDataAction,
  deleteRawMessagesAction,
  setProfilingEnabledAction
} from '../actions/settings';

type Props = { profilingEnabled: boolean };

export default function DataControls({ profilingEnabled }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<void>, message: string) =>
    startTransition(async () => {
      await fn();
      toast.success(message);
      router.refresh();
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Your data</CardTitle>
        <CardDescription>
          Raw transcripts and derived signal are separate, so you can drop one
          and keep the other.
        </CardDescription>
      </CardHeader>

      <CardContent className='flex flex-col gap-5'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex flex-col'>
            <span className='text-sm font-medium'>Profiling</span>
            <span className='text-muted-foreground text-xs'>
              {profilingEnabled
                ? 'Messages are stored, tagged, and rolled up nightly'
                : 'Off — nothing is stored or inferred'}
            </span>
          </div>
          <Switch
            checked={profilingEnabled}
            disabled={pending}
            onCheckedChange={(checked) =>
              run(
                () => setProfilingEnabledAction(checked),
                checked ? 'Profiling on' : 'Profiling paused'
              )
            }
          />
        </div>

        <div className='flex flex-wrap gap-2'>
          <ConfirmButton
            label='Delete transcripts'
            title='Delete your chat transcripts?'
            body='Every message and conversation is removed. Your topics, personality readings, and snapshots stay — they were derived from these messages but do not contain them.'
            disabled={pending}
            onConfirm={() =>
              run(deleteRawMessagesAction, 'Transcripts deleted')
            }
          />
          <ConfirmButton
            label='Delete everything'
            title='Delete all profile data?'
            body='Messages, topics, snapshots, starters, and your Mirror persona are all removed, and profiling is turned off. This cannot be undone.'
            destructive
            disabled={pending}
            onConfirm={() =>
              run(deleteAllProfileDataAction, 'All profile data deleted')
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ConfirmButton({
  label,
  title,
  body,
  destructive,
  disabled,
  onConfirm
}: {
  label: string;
  title: string;
  body: string;
  destructive?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={destructive ? 'destructive' : 'outline'}
          size='sm'
          disabled={disabled}
        >
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
