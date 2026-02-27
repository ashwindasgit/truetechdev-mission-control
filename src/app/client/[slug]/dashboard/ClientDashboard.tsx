'use client';

import Image from 'next/image';

/* ──────────────────────────────────────────── Types */

interface EventMetadata {
  url?: string;
  issue_url?: string;
  repo_url?: string;
  [key: string]: unknown;
}

interface Event {
  id: string;
  provider: string;
  event_type: string;
  severity: string;
  title: string;
  metadata: EventMetadata;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  qa_checks: Record<string, boolean> | null;
}

interface Module {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
}

interface Metrics {
  error_count: number;
  uptime_percent: number | null;
  qa_pass_rate: number | null;
}

interface Project {
  name: string;
  client_name: string | null;
  status: string;
  start_date: string | null;
  target_end_date: string | null;
  budget_hours: number | null;
  used_hours: number | null;
  next_milestone: string | null;
  next_milestone_date: string | null;
}

interface Blocker {
  id: string;
  title: string;
  waiting_on: string;
  status: string;
}

interface ChangeRequest {
  id: string;
  title: string;
  description: string | null;
  status: string;
  hours_impact: number;
}

interface DashboardData {
  project: Project;
  events: Event[];
  modules: Module[];
  metrics: Metrics;
  blockers: Blocker[];
  changeRequests: ChangeRequest[];
}

interface DashboardProps {
  slug: string;
  data: DashboardData;
  summary: string | null;
}

/* ──────────────────────────────────────────── Constants */

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  backlog:  { label: 'Backlog',  classes: 'bg-white/10 text-white/40' },
  in_dev:   { label: 'In Dev',   classes: 'bg-blue-500/20 text-blue-300' },
  in_qa:    { label: 'In QA',    classes: 'bg-yellow-500/20 text-yellow-300' },
  approved: { label: 'Approved', classes: 'bg-purple-500/20 text-purple-300' },
  deployed: { label: 'Deployed', classes: 'bg-emerald-500/20 text-emerald-300' },
  failed:   { label: 'Failed',   classes: 'bg-red-500/20 text-red-300' },
};

const SEVERITY_DOT: Record<string, string> = {
  success: 'bg-emerald-400',
  error: 'bg-red-400',
  warning: 'bg-amber-400',
  info: 'bg-blue-400',
};

const PROVIDER_STYLE: Record<string, string> = {
  github: 'bg-white/10 text-white/60',
  sentry: 'bg-purple-500/20 text-purple-300',
  vercel: 'bg-white/10 text-white',
  betteruptime: 'bg-emerald-500/20 text-emerald-300',
};

/* ──────────────────────────────────────────── Helpers */

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getEventLink(metadata: EventMetadata): string | null {
  return metadata.url || metadata.issue_url || metadata.repo_url || null;
}

function daysRemaining(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

function timelinePercent(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  if (e <= s) return 100;
  const pct = ((now - s) / (e - s)) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/* ──────────────────────────────────────────── Main Component */

export default function ClientDashboard({ data, summary }: DashboardProps) {
  const { project, events, modules, metrics, blockers, changeRequests } = data;

  const budgetPercent =
    project.budget_hours && project.used_hours
      ? Math.round((project.used_hours / project.budget_hours) * 100)
      : 0;

  const budgetGradient =
    budgetPercent > 90
      ? 'from-red-500 to-orange-400'
      : budgetPercent > 70
        ? 'from-amber-500 to-amber-300'
        : 'from-emerald-500 to-emerald-300';

  const budgetColor =
    budgetPercent > 90
      ? 'text-red-400'
      : budgetPercent > 70
        ? 'text-amber-400'
        : 'text-emerald-400';

  const showTimeline = project.start_date && project.target_end_date;
  const showBudget = project.budget_hours !== null && project.used_hours !== null;
  const showTimelineBudget = showTimeline || showBudget;

  const approvedHours = changeRequests
    .filter((cr) => cr.status === 'approved')
    .reduce((sum, cr) => sum + cr.hours_impact, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between border-b border-white/10 pb-8 mb-8">
          <div>
            <Image src="/logo.png" alt="True Tech Professionals" width={160} height={32} className="h-12 w-auto object-contain" />
          </div>
          <div className="text-right">
            <h1 className="text-white text-2xl font-bold">{project.name}</h1>
            {project.client_name && (
              <p className="text-white/50 text-sm">{project.client_name}</p>
            )}
            <div className="flex items-center justify-end gap-2 mt-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-emerald-400 text-xs font-medium capitalize">{project.status}</span>
            </div>
          </div>
        </div>

        {/* ── Next Milestone ── */}
        {project.next_milestone && (
          <div
            className="bg-white/5 backdrop-blur-md border border-amber-500/20 rounded-2xl p-6 mb-6"
            style={{ boxShadow: '0 0 40px rgba(251, 191, 36, 0.06)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-amber-400/60 text-xs uppercase tracking-widest">Next Milestone</p>
                <p className="text-white text-xl font-semibold mt-1">{project.next_milestone}</p>
              </div>
              {project.next_milestone_date && (
                <div className="text-right">
                  <p className="text-white/60 text-sm">{formatDate(project.next_milestone_date)}</p>
                  <p className="text-amber-400 text-2xl font-bold">{daysRemaining(project.next_milestone_date)}</p>
                  <p className="text-white/40 text-xs">days remaining</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <GlassCard>
            <div className="h-0.5 rounded-full mb-4 bg-gradient-to-r from-emerald-500 to-emerald-300" />
            <p className="text-2xl mb-2">{'\uD83D\uDFE2'}</p>
            <p className="text-white/40 text-xs uppercase tracking-wider">Uptime</p>
            <p className="text-white text-4xl font-bold mt-1">
              {metrics.uptime_percent !== null ? `${metrics.uptime_percent}%` : 'N/A'}
            </p>
          </GlassCard>
          <GlassCard>
            <div className="h-0.5 rounded-full mb-4 bg-gradient-to-r from-red-500 to-orange-400" />
            <p className="text-2xl mb-2">{'\u26A0\uFE0F'}</p>
            <p className="text-white/40 text-xs uppercase tracking-wider">Errors (7d)</p>
            <p className="text-white text-4xl font-bold mt-1">{metrics.error_count}</p>
          </GlassCard>
          <GlassCard>
            <div className="h-0.5 rounded-full mb-4 bg-gradient-to-r from-blue-500 to-cyan-400" />
            <p className="text-2xl mb-2">{'\u2705'}</p>
            <p className="text-white/40 text-xs uppercase tracking-wider">QA Pass Rate</p>
            <p className="text-white text-4xl font-bold mt-1">
              {metrics.qa_pass_rate !== null ? `${metrics.qa_pass_rate}%` : 'N/A'}
            </p>
          </GlassCard>
        </div>

        {/* ── Timeline + Budget ── */}
        {showTimelineBudget && (
          <div className={`grid gap-4 mb-6 ${showTimeline && showBudget ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {showTimeline && (
              <GlassCard>
                <p className="text-white font-medium mb-4">Project Timeline</p>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                    style={{ width: `${timelinePercent(project.start_date!, project.target_end_date!)}%` }}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 text-xs">{formatDate(project.start_date!)}</span>
                  <span className="text-white/40 text-xs">{formatDate(project.target_end_date!)}</span>
                </div>
              </GlassCard>
            )}
            {showBudget && (
              <GlassCard>
                <p className="text-white font-medium mb-4">Budget</p>
                <div className="mb-3">
                  <span className="text-white text-3xl font-bold">{project.used_hours}</span>
                  <span className="text-white/40"> / {project.budget_hours} hrs</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${budgetGradient} transition-all duration-500`}
                    style={{ width: `${Math.min(100, budgetPercent)}%` }}
                  />
                </div>
                <p className={`${budgetColor} text-sm`}>{budgetPercent}% used</p>
              </GlassCard>
            )}
          </div>
        )}

        {/* ── AI Summary ── */}
        {summary && (
          <div
            className="bg-white/5 backdrop-blur-md border border-purple-500/20 rounded-2xl p-6 mb-6"
            style={{ boxShadow: '0 0 40px rgba(168, 85, 247, 0.08)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-purple-300 text-sm font-medium">{'\u2728'} Project Summary</p>
              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs px-2 py-0.5 rounded-full">
                AI-generated
              </span>
            </div>
            <div className="mt-3">
              {summary
                .split(/([\u{1F4CB}\u{1F4C5}\u{1F4B0}\u{1F528}\u{26A0}\u{FE0F}\u{1F512}])/u)
                .reduce<string[]>((acc, chunk) => {
                  if (/^[\u{1F4CB}\u{1F4C5}\u{1F4B0}\u{1F528}\u{26A0}\u{FE0F}\u{1F512}]$/u.test(chunk)) {
                    acc.push(chunk);
                  } else if (acc.length > 0) {
                    acc[acc.length - 1] += chunk;
                  } else if (chunk.trim()) {
                    acc.push(chunk);
                  }
                  return acc;
                }, [])
                .map((section, i) => (
                  <p key={i} className="text-white/80 text-sm leading-relaxed mb-2 last:mb-0">
                    {section.trim()}
                  </p>
                ))}
            </div>
            <p className="text-white/20 text-xs mt-3">Refreshes every 30 min</p>
          </div>
        )}

        {/* ── Blockers ── */}
        {blockers.length > 0 && (
          <div className="bg-white/5 backdrop-blur-md border border-amber-500/20 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{'\u26A0\uFE0F'}</span>
              <p className="text-amber-400 font-medium">Action Required</p>
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-2 py-0.5 rounded-full">
                {blockers.length}
              </span>
            </div>
            <div className="space-y-3">
              {blockers.map((b) => (
                <div key={b.id} className="border-l-2 border-amber-500/50 pl-3 py-1">
                  <p className="text-white/80 text-sm">{b.title}</p>
                  {b.waiting_on === 'client' && (
                    <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full mt-1 inline-block">
                      Waiting on you
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Recent Activity ── */}
        <GlassCard className="mb-6">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Recent Activity</p>
          {events.length === 0 ? (
            <p className="text-white/30 text-sm py-4 text-center">No events yet.</p>
          ) : (
            <div>
              {events.map((event, i) => {
                const link = getEventLink(event.metadata);
                return (
                  <div
                    key={event.id}
                    className={`flex items-center gap-3 py-3 ${
                      i < events.length - 1 ? 'border-b border-white/5' : ''
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_DOT[event.severity] ?? SEVERITY_DOT.info}`} />
                    <span className="text-white/80 text-sm flex-1">{event.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        PROVIDER_STYLE[event.provider] ?? 'bg-white/10 text-white/40'
                      }`}
                    >
                      {event.provider}
                    </span>
                    <span className="text-white/30 text-xs">{timeAgo(event.created_at)}</span>
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* ── Scope Changes ── */}
        {changeRequests.length > 0 && (
          <GlassCard className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-medium">Scope Changes</p>
              <p className="text-white/40 text-sm">+{approvedHours} hrs approved</p>
            </div>
            <div className="space-y-2">
              {changeRequests.map((cr) => {
                const isRejected = cr.status === 'rejected';
                const hourStyle =
                  cr.status === 'approved'
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : cr.status === 'pending'
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-red-400 bg-red-500/10';
                const statusStyle =
                  cr.status === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : cr.status === 'pending'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-red-500/20 text-red-300';
                return (
                  <div key={cr.id} className="flex items-start gap-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-white/80 text-sm ${isRejected ? 'line-through' : ''}`}>
                        {cr.title}
                      </p>
                      {cr.description && (
                        <p className="text-white/40 text-xs mt-0.5">{cr.description}</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${hourStyle}`}>
                      +{cr.hours_impact} hrs
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusStyle}`}>
                      {cr.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* ── Feature Progress ── */}
        {modules.length > 0 && (
          <GlassCard className="mb-0">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Feature Progress</p>
            <div className="space-y-6">
              {modules.map((mod) => {
                const total = mod.tasks.length;
                const complete = mod.tasks.filter((t) => t.status === 'deployed').length;
                const percent = total > 0 ? Math.round((complete / total) * 100) : 0;
                return (
                  <div key={mod.id}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-medium">{mod.name}</p>
                      <p className="text-white/40 text-xs">{complete}/{total} tasks</p>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      {mod.tasks.map((task) => {
                        const st = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.backlog;
                        return (
                          <div key={task.id} className="flex items-center gap-2.5 pl-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.classes}`}>
                              {st.label}
                            </span>
                            <span className="text-white/60 text-sm">{task.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* ── Footer ── */}
        <footer className="border-t border-white/5 mt-12 pt-6 pb-8 text-center">
          <p className="text-white/20 text-xs">
            Powered by True Tech Dev &middot; Mission Control
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── Glass Card */

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}
