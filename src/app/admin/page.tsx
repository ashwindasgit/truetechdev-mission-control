import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

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

  return (
    <div className="p-8">

      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-white/40 text-sm mt-1">All active client projects</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
        >
          + New Project
        </Link>
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-20">
          <p className="text-white/30 text-sm">No projects yet.</p>
        </div>
      )}

      {/* Project Cards */}
      <div className="grid grid-cols-1 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-white/5 border border-white/10 rounded-xl px-6 py-5 flex items-center justify-between hover:bg-white/[0.07] transition-colors"
          >
            {/* Left — name + status */}
            <div className="flex items-center gap-4">
              {/* Status dot */}
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  project.status === 'active'
                    ? 'bg-emerald-400'
                    : 'bg-white/20'
                }`}
              />
              <div>
                <p className="text-white font-medium text-sm">{project.name}</p>
                <p className="text-white/30 text-xs mt-0.5 capitalize">{project.status}</p>
              </div>
            </div>

            {/* Right — date + open button */}
            <div className="flex items-center gap-6">
              <p className="text-white/30 text-xs hidden sm:block">
                {new Date(project.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <Link
                href={`/admin/projects/${project.id}`}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-white/60 text-xs font-medium hover:text-white hover:border-white/30 transition-colors"
              >
                Open →
              </Link>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
