import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { RecentActivity } from '../server/actions';
import {
  IconActivity,
  IconCreditCard,
  IconShoppingCart,
  IconListCheck
} from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';

export function RecentSales({ activities }: { activities: RecentActivity[] }) {
  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest updates across your features.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-8'>
          {activities.length === 0 && (
            <p className='text-muted-foreground text-sm'>
              No recent activity found.
            </p>
          )}
          {activities.map((activity) => (
            <div key={activity.id} className='flex items-center'>
              <Avatar className='h-9 w-9'>
                <AvatarFallback
                  className={
                    activity.type === 'workout'
                      ? 'bg-blue-100 text-blue-600'
                      : activity.type === 'payment'
                        ? 'bg-green-100 text-green-600'
                        : activity.type === 'purchase'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-purple-100 text-purple-600'
                  }
                >
                  {activity.type === 'workout' && <IconActivity size={18} />}
                  {activity.type === 'payment' && <IconCreditCard size={18} />}
                  {activity.type === 'purchase' && (
                    <IconShoppingCart size={18} />
                  )}
                  {activity.type === 'list_item' && <IconListCheck size={18} />}
                </AvatarFallback>
              </Avatar>
              <div className='ml-4 space-y-1 overflow-hidden'>
                <p className='truncate text-sm leading-none font-medium'>
                  {activity.title}
                </p>
                <p className='text-muted-foreground text-xs'>
                  {activity.description} •{' '}
                  {formatDistanceToNow(new Date(activity.date), {
                    addSuffix: true
                  })}
                </p>
              </div>
              <div className='ml-auto text-sm font-medium'>
                {activity.amount}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
