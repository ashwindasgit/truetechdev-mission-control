import { createClient } from '@/lib/supabase/server';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-2">Projects</h1>
      <p className="text-zinc-400">
        Signed in as <span className="text-zinc-200">{user?.email}</span>
      </p>
    </div>
  );
}
