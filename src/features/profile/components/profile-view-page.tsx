import { UserProfile } from '@clerk/nextjs';

export default function ProfileViewPage() {
  return (
    <div className='flex min-h-[60vh] w-full flex-col items-center justify-center p-4'>
      <UserProfile />
    </div>
  );
}
