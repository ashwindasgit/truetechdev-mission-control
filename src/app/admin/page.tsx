import { createClient } from '@/lib/supabase/server';
import ProjectList from './ProjectList';

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-400 text-sm">Failed to load projects: {error.message}</p>
      </div>
    );
  }

  return <ProjectList projects={projects ?? []} />;
}
