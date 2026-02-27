'use client';

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
}

interface DashboardData {
  project: Project;
  events: Event[];
  modules: Module[];
  metrics: Metrics;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  backlog:  { label: 'Backlog',  classes: 'bg-white/10 text-white/40' },
  in_dev:   { label: 'In Dev',   classes: 'bg-blue-500/20 text-blue-300' },
  in_qa:    { label: 'In QA',    classes: 'bg-yellow-500/20 text-yellow-300' },
  approved: { label: 'Approved', classes: 'bg-purple-500/20 text-purple-300' },
  deployed: { label: 'Deployed', classes: 'bg-emerald-500/20 text-emerald-300' },
  failed:   { label: 'Failed',   classes: 'bg-red-500/20 text-red-300' },
};

const SEVERITY_ICON: Record<string, string> = {
  success: '\u2705',
  error: '\u274C',
  warning: '\u26A0\uFE0F',
  info: '\u2139\uFE0F',
};

const PROVIDER_STYLE: Record<string, string> = {
  github: 'bg-white/10 text-white/60',
  sentry: 'bg-purple-500/20 text-purple-300',
  vercel: 'bg-white/10 text-white',
  betteruptime: 'bg-emerald-500/20 text-emerald-300',
};

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

export default function ClientDashboard({ data }: { slug: string; data: DashboardData }) {
  const { project, events, modules, metrics } = data;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-1">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                project.status === 'active' ? 'bg-emerald-400' : 'bg-white/20'
              }`}
            />
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          </div>
          {project.client_name && (
            <p className="text-white/40 text-sm ml-[22px]">{project.client_name}</p>
          )}
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <MetricCard
            label="Uptime"
            value={metrics.uptime_percent !== null ? `${metrics.uptime_percent}%` : 'N/A'}
          />
          <MetricCard
            label="Errors (7d)"
            value={String(metrics.error_count)}
          />
          <MetricCard
            label="QA Pass Rate"
            value={metrics.qa_pass_rate !== null ? `${metrics.qa_pass_rate}%` : 'N/A'}
          />
        </div>

        {/* Recent Activity */}
        <section className="mb-10">
          <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
            Recent Activity
          </h2>
          {events.length === 0 ? (
            <p className="text-white/30 text-sm py-8 text-center">No events yet.</p>
          ) : (
            <div className="space-y-2">
              {events.map((event) => {
                const link = getEventLink(event.metadata);
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 px-4 py-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <span className="text-base flex-shrink-0 mt-0.5">
                      {SEVERITY_ICON[event.severity] ?? SEVERITY_ICON.info}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{event.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            PROVIDER_STYLE[event.provider] ?? 'bg-white/10 text-white/40'
                          }`}
                        >
                          {event.provider}
                        </span>
                        <span className="text-white/30 text-xs">
                          {timeAgo(event.created_at)}
                        </span>
                      </div>
                    </div>
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0 mt-0.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Feature Progress */}
        <section className="mb-10">
          <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
            Feature Progress
          </h2>
          {modules.length === 0 ? (
            <p className="text-white/30 text-sm py-8 text-center">No modules yet.</p>
          ) : (
            <div className="space-y-6">
              {modules.map((mod) => {
                const total = mod.tasks.length;
                const complete = mod.tasks.filter((t) => t.status === 'deployed').length;
                const percent = total > 0 ? Math.round((complete / total) * 100) : 0;
                return (
                  <div key={mod.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-semibold">{mod.name}</h3>
                      <span className="text-white/30 text-xs">
                        {complete}/{total} tasks complete
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="space-y-2">
                      {mod.tasks.map((task) => {
                        const st = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.backlog;
                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-3 px-3 py-2"
                          >
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.classes}`}
                            >
                              {st.label}
                            </span>
                            <span className="text-white/70 text-sm">{task.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-white/10">
          <p className="text-white/20 text-xs">
            Powered by True Tech Dev &middot; Mission Control
          </p>
        </footer>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <p className="text-white/30 text-xs mb-2">{label}</p>
      <p className="text-white text-3xl font-bold">{value}</p>
    </div>
  );
}
