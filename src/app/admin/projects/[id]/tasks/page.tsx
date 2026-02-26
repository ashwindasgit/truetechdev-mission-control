import { createClient } from '@/lib/supabase/server';
import TaskBoard from './TaskBoard';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TasksPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: modules } = await supabase
    .from('modules')
    .select('id, name, position, tasks(id, title, status, pr_url, position)')
    .eq('project_id', id)
    .order('position', { ascending: true })
    .order('position', { ascending: true, foreignTable: 'tasks' });

  return <TaskBoard projectId={id} initialModules={modules ?? []} />;
}
