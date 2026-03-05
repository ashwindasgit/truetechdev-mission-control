'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Developer {
  id: string;
  name: string;
  email: string;
  github_username: string;
  slug: string;
  stacks: string[];
  status: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  project_id: string;
  linked_pr_numbers: number[];
  module_name: string;
}

interface PrAudit {
  pr_number: number;
  audit_summary: string;
  confidence_score: number;
  passed: boolean;
  review_action: 'approved' | 'changes_requested' | null;
  review_note: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  paused: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  offboarded: 'bg-red-500/15 text-red-400 border-red-500/20',
};

const TASK_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-white/10 text-white/50 border-white/10',
  'in-progress': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  review: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  done: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};

export default function DevDashboard({
  developer,
  tasks,
}: {
  developer: Developer;
  tasks: Task[];
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [auditMap, setAuditMap] = useState<Record<string, PrAudit>>({});
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);

  // Fetch audits for all projects the developer has tasks in
  useEffect(() => {
    const projectIds = Array.from(new Set(tasks.map((t) => t.project_id).filter(Boolean)));
    if (projectIds.length === 0) return;

    Promise.all(
      projectIds.map((pid) =>
        fetch(`/api/pr-audits/${pid}`)
          .then((res) => (res.ok ? res.json() : []))
          .catch(() => [])
      )
    ).then((results) => {
      const map: Record<string, PrAudit> = {};
      for (const audits of results) {
        for (const audit of audits as PrAudit[]) {
          const key = String(audit.pr_number);
          if (!map[key]) {
            map[key] = audit;
          }
        }
      }
      setAuditMap(map);
    });
  }, [tasks]);

  async function handleSignOut() {
    setSigningOut(true);
    await fetch('/api/dev/auth/signout', { method: 'POST' });
    router.push(`/dev/${developer.slug}`);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#07070f]">
      {/* Header */}
      <header className="border-b border-white/10 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{developer.name}</h1>
          <p className="text-white/40 text-sm">@{developer.github_username}</p>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="px-4 py-2 rounded-lg border border-white/10 text-white/50 text-sm font-medium hover:text-white hover:border-white/30 transition-colors disabled:opacity-50"
        >
          {signingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </header>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1 — Profile */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4">Your Profile</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">Name</span>
              <span className="text-white">{developer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Email</span>
              <span className="text-white">{developer.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">GitHub</span>
              <span className="text-white">@{developer.github_username}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-white/40">Stacks</span>
              <div className="flex flex-wrap gap-1.5 justify-end">
                {developer.stacks.length > 0 ? (
                  developer.stacks.map((stack) => (
                    <span
                      key={stack}
                      className="px-2 py-0.5 bg-white/10 text-white/70 text-xs rounded-full"
                    >
                      {stack}
                    </span>
                  ))
                ) : (
                  <span className="text-white/30">—</span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40">Status</span>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                  STATUS_BADGE[developer.status] ??
                  'bg-white/10 text-white/40 border-white/10'
                }`}
              >
                {developer.status}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2 — Tasks */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4">Your Tasks</h2>

          {tasks.length === 0 ? (
            <p className="text-white/30 text-sm py-8 text-center">
              No tasks assigned yet.
            </p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const prs = task.linked_pr_numbers ?? [];
                return (
                  <div key={task.id} className="py-2.5 px-3 bg-white/[0.03] rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium truncate">
                          {task.title}
                        </p>
                        <p className="text-white/30 text-xs mt-0.5">
                          {task.module_name}
                        </p>
                      </div>
                      <span
                        className={`ml-3 flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                          TASK_STATUS_BADGE[task.status] ??
                          'bg-white/10 text-white/40 border-white/10'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>

                    {/* PR audit badges */}
                    {prs.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {prs.map((pr) => {
                          const audit = auditMap[String(pr)];
                          const auditKey = `${task.id}-${pr}`;
                          const isExpanded = expandedAudit === auditKey;
                          return (
                            <div key={pr}>
                              <div className="flex items-center gap-2">
                                <span className="text-white/30 text-xs">#{pr}</span>
                                {audit ? (
                                  <button
                                    onClick={() => setExpandedAudit(isExpanded ? null : auditKey)}
                                    className={`px-2 py-0.5 text-xs rounded-full font-medium transition-colors ${
                                      audit.passed
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25'
                                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25'
                                    }`}
                                  >
                                    {audit.passed ? '✅ PASSED' : '⚠️ NEEDS REVIEW'} {audit.confidence_score.toFixed(2)}
                                  </button>
                                ) : (
                                  <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-white/5 text-white/30 border border-white/10">
                                    ⏳ Pending
                                  </span>
                                )}
                              </div>
                              {audit && isExpanded && (
                                <div className="mt-1 ml-4 space-y-1.5">
                                  <p className="text-white/50 text-xs leading-relaxed">
                                    {audit.audit_summary}
                                  </p>
                                  {audit.review_action === 'changes_requested' && (
                                    <div className="p-2 rounded-lg border bg-amber-500/10 border-amber-500/20">
                                      <p className="text-xs font-medium text-amber-400">⚠ Changes Requested</p>
                                      {audit.review_note && (
                                        <p className="text-white/50 text-xs mt-1">{audit.review_note}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
