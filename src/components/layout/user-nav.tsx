'use client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { SignOutButton, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { ModeToggle } from './ThemeToggle/theme-toggle';
import { ThemeSelector } from '../theme-selector';
import {
  UserIcon,
  CreditCardIcon,
  SettingsIcon,
  LogOutIcon,
  UsersIcon
} from 'lucide-react';

export function UserNav() {
  const { user } = useUser();
  const router = useRouter();
  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
            <UserAvatarProfile user={user} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className='w-64'
          align='end'
          sideOffset={10}
          forceMount
        >
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm leading-none font-medium'>
                {user.fullName}
              </p>
              <p className='text-muted-foreground text-xs leading-none'>
                {user.emailAddresses[0].emailAddress}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              className='cursor-pointer'
              onClick={() => router.push('/dashboard/auth-settings/workspaces')}
            >
              <SettingsIcon className='mr-2 h-4 w-4' />
              Workspaces
            </DropdownMenuItem>
            <DropdownMenuItem
              className='cursor-pointer'
              onClick={() =>
                router.push('/dashboard/auth-settings/workspaces/team')
              }
            >
              <UsersIcon className='mr-2 h-4 w-4' />
              Teams
            </DropdownMenuItem>
            <DropdownMenuItem
              className='cursor-pointer'
              onClick={() => router.push('/dashboard/auth-settings/billing')}
            >
              <CreditCardIcon className='mr-2 h-4 w-4' />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem
              className='cursor-pointer'
              onClick={() => router.push('/dashboard/auth-settings/profile')}
            >
              <UserIcon className='mr-2 h-4 w-4' />
              Profile
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <div className='flex items-center justify-between px-2 py-1.5'>
              <span className='text-sm'>Appearance</span>
              <ModeToggle />
            </div>
            <div className='px-2 py-1.5'>
              <ThemeSelector minimal />
            </div>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className='text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer'
            asChild
          >
            <div className='flex items-center'>
              <LogOutIcon className='mr-2 h-4 w-4' />
              <SignOutButton redirectUrl='/auth/sign-in' />
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
}
