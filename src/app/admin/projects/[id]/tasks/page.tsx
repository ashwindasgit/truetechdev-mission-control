import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import TaskBoard from './TaskBoard';
import ProjectTabBar from '../ProjectTabBar';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TasksPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('id', id)
    .single();

  if (!project) notFound();

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

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              project.status === 'active' ? 'bg-emerald-400' : 'bg-white/20'
            }`}
          />
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
        </div>
        <p className="text-white/40 text-sm ml-[22px] capitalize">{project.status}</p>
      </div>
      <ProjectTabBar projectId={id} activeTab="Tasks" />
      <TaskBoard
        projectId={id}
        initialModules={modules ?? []}
        developers={developers ?? []}
        repoUrl={null}
      />
    </div>
  );
}
