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
    .select('id, name, position, tasks(id, title, status, pr_url, position, qa_checks, developer_id, acceptance_criteria, linked_pr_numbers)')
    .eq('project_id', id)
    .order('position', { ascending: true })
    .order('position', { ascending: true, foreignTable: 'tasks' });

  const { data: developers } = await supabase
    .from('developers')
    .select('id, name, github_username, status')
    .order('name', { ascending: true });

  const { data: project } = await supabase
    .from('projects')
    .select('github_repo_url')
    .eq('id', id)
    .single();

  return (
    <TaskBoard
      projectId={id}
      initialModules={modules ?? []}
      developers={developers ?? []}
      repoUrl={project?.github_repo_url ?? null}
    />
  );
}
