'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export default function ProjectList({ projects: initial }: { projects: Project[] }) {
  const [projects, setProjects] = useState(initial);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const visible = showArchived
    ? projects
    : projects.filter((p) => p.status !== 'archived');

  async function toggleArchive(id: string, archived: boolean) {
    setLoading(id);
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: archived ? 'active' : 'archived' }),
    });
    if (res.ok) {
      const { project } = await res.json();
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status: project.status } : p)));
      router.refresh();
    }
    setLoading(null);
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-white/40 text-sm mt-1">All active client projects</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              showArchived
                ? 'border-purple-500/30 text-purple-300 bg-purple-500/10'
                : 'border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
            }`}
          >
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
          <Link
            href="/admin/projects/new"
            className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            + New Project
          </Link>
        </div>
      </div>

      {/* Empty State */}
      {visible.length === 0 && (
        <div className="text-center py-20">
          <p className="text-white/30 text-sm">No projects yet.</p>
        </div>
      )}

      {/* Project Cards */}
      <div className="grid grid-cols-1 gap-4">
        {visible.map((project) => {
          const isArchived = project.status === 'archived';
          return (
            <div
              key={project.id}
              className={`bg-white/5 border border-white/10 rounded-xl px-6 py-5 flex items-center justify-between hover:bg-white/[0.07] transition-colors ${
                isArchived ? 'opacity-50' : ''
              }`}
            >
              {/* Left — name + status */}
              <div className="flex items-center gap-4">
                {/* Status dot */}
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    project.status === 'active'
                      ? 'bg-emerald-400'
                      : isArchived
                        ? 'bg-white/10'
                        : 'bg-white/20'
                  }`}
                />
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-white font-medium text-sm">{project.name}</p>
                    <p className="text-white/30 text-xs mt-0.5 capitalize">{project.status}</p>
                  </div>
                  {isArchived && (
                    <span className="bg-white/10 text-white/30 text-[10px] px-2 py-0.5 rounded-full font-medium">
                      Archived
                    </span>
                  )}
                </div>
              </div>

              {/* Right — date + actions */}
              <div className="flex items-center gap-3">
                <p className="text-white/30 text-xs hidden sm:block">
                  {new Date(project.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
                <button
                  onClick={() => toggleArchive(project.id, isArchived)}
                  disabled={loading === project.id}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    isArchived
                      ? 'border-emerald-500/20 text-emerald-400/60 hover:text-emerald-400 hover:border-emerald-500/40'
                      : 'border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  {loading === project.id
                    ? '...'
                    : isArchived
                      ? 'Unarchive'
                      : 'Archive'}
                </button>
                <Link
                  href={`/admin/projects/${project.id}`}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-white/60 text-xs font-medium hover:text-white hover:border-white/30 transition-colors"
                >
                  Open →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
