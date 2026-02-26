import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ProjectTabs from './ProjectTabs';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, status, client_name, client_slug, created_at')
    .eq('id', id)
    .single();

  if (error || !project) {
    notFound();
  }

  return (
    <div className="p-8">

      {/* Page Header */}
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

      {/* Tabs */}
      <ProjectTabs project={project} />

    </div>
  );
}
