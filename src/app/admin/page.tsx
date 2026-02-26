import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from './sign-out-button';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold text-white mb-2">Mission Control</h1>
      <p className="text-zinc-400 mb-6">
        Signed in as <span className="text-zinc-200">{user.email}</span>
      </p>
      <SignOutButton />
    </div>
  );
}
