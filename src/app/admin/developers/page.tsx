import { createClient } from '@/lib/supabase/server';
import DeveloperList from './DeveloperList';

export default async function DevelopersPage() {
  const supabase = await createClient();

  const { data: developers, error } = await supabase
    .from('developers')
    .select('id, name, email, github_username, slug, stacks, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-400 text-sm">Failed to load developers: {error.message}</p>
      </div>
    );
  }

  return <DeveloperList developers={developers ?? []} />;
}
