'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useChatPanel } from '@/features/chat/store';
import { IconSparkles } from '@tabler/icons-react';
import { useTransition } from 'react';
import { setMirrorEnabledAction } from '../actions/settings';

type Props = {
  enabled: boolean;
  ready: boolean;
  backingMessageCount: number;
};

export default function MirrorCard({
  enabled,
  ready,
  backingMessageCount
}: Props) {
  const [pending, startTransition] = useTransition();
  const { setMode, show } = useChatPanel();

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between gap-3'>
          <CardTitle className='flex items-center gap-2 text-base'>
            <IconSparkles className='size-4' />
            Mirror Mode
          </CardTitle>
          {ready ? (
            <Badge variant='secondary'>
              {backingMessageCount.toLocaleString()} messages
            </Badge>
          ) : (
            <Badge variant='outline'>Not ready</Badge>
          )}
        </div>
        <CardDescription>
          Chat with a persona reconstructed from how you write — your topics,
          your voice, your habits. It is a model of you, not you, and it is told
          to say so rather than invent things it does not know.
        </CardDescription>
      </CardHeader>

      <CardContent className='flex flex-col gap-3'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex flex-col'>
            <span className='text-sm font-medium'>Enable Mirror Mode</span>
            <span className='text-muted-foreground text-xs'>
              {ready
                ? 'Turns on the mirror toggle in the chat panel'
                : 'Needs a personality reading first'}
            </span>
          </div>
          <Switch
            checked={enabled}
            disabled={!ready || pending}
            onCheckedChange={(checked) =>
              startTransition(async () => {
                await setMirrorEnabledAction(checked);
              })
            }
          />
        </div>

        <p className='text-muted-foreground text-xs'>
          Mirror conversations are stored separately and never fed back into
          your profile — otherwise the model would end up learning from its own
          imitation of you.
        </p>
      </CardContent>

      {enabled && ready ? (
        <CardFooter>
          <Button
            size='sm'
            onClick={() => {
              setMode('mirror');
              show();
            }}
          >
            Talk to your mirror
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
