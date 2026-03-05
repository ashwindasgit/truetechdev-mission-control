'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import EventFeed from '@/components/admin/EventFeed';
import KnowledgeBaseTab from './KnowledgeBaseTab';
import ProjectTabBar from './ProjectTabBar';

interface Project {
  id: string;
  name: string;
  status: string;
  client_name: string | null;
  client_slug: string | null;
  client_password: string | null;
  created_at: string;
  start_date: string | null;
  target_end_date: string | null;
  budget_hours: number | null;
  used_hours: number | null;
  next_milestone: string | null;
  next_milestone_date: string | null;
  branch_protection?: {
    require_audit: boolean;
    auto_audit_on_pr: boolean;
    min_confidence_to_pass: number;
  };
}

interface Blocker {
  id: string;
  project_id: string;
  title: string;
  waiting_on: string;
  status: string;
  created_at: string;
}

interface ChangeRequest {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  hours_impact: number;
  created_at: string;
}

interface Props {
  project: Project;
  projectId: string;
  blockers: Blocker[];
  changeRequests: ChangeRequest[];
}

const TAB_MAP: Record<string, string> = {
  feed: 'Feed',
  knowledge: 'Knowledge Base',
  settings: 'Settings',
};

export default function ProjectTabs({ project, projectId, blockers, changeRequests }: Props) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') ?? '';
  const activeTab = TAB_MAP[tabParam] ?? 'Overview';

  return (
    <div>
      <ProjectTabBar projectId={projectId} activeTab={activeTab} />

      {activeTab === 'Overview' && <OverviewTab project={project} />}
      {activeTab === 'Feed' && <EventFeed projectId={project.id} />}
      {activeTab === 'Knowledge Base' && <KnowledgeBaseTab projectId={project.id} />}
      {activeTab === 'Settings' && (
        <SettingsTab
          project={project}
          initialBlockers={blockers}
          initialChangeRequests={changeRequests}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────── Overview Tab */

function OverviewTab({ project }: { project: Project }) {
  const [uptime, setUptime] = useState<{ value: string; note: string }>({ value: '—', note: 'Loading...' });
  const [errors, setErrors] = useState<{ value: string; note: string }>({ value: '—', note: 'Loading...' });
  const [qaRate, setQaRate] = useState<{ value: string; note: string }>({ value: '—', note: 'Loading...' });

  useEffect(() => {
    // Fetch events for health metrics
    fetch(`/api/events?projectId=${project.id}`)
      .then((res) => res.json())
      .then(({ events }: { events: { provider: string; event_type: string; severity: string }[] }) => {
        // Uptime: check betteruptime events
        const btEvents = events.filter((e) => e.provider === 'betteruptime');
        if (btEvents.length === 0) {
          setUptime({ value: '—', note: 'Connect Better Uptime' });
        } else {
          const downs = btEvents.filter((e) => e.event_type === 'site_down').length;
          const recoveries = btEvents.filter((e) => e.event_type === 'site_recovered').length;
          if (downs === 0) {
            setUptime({ value: '100%', note: `${btEvents.length} events tracked` });
          } else {
            const incidents = Math.max(downs, recoveries);
            setUptime({ value: `${incidents} incident${incidents !== 1 ? 's' : ''}`, note: `${downs} down, ${recoveries} recovered` });
          }
        }

        // Errors: sentry events
        const sentryErrors = events.filter((e) => e.provider === 'sentry' && e.event_type === 'error');
        const sentryResolved = events.filter((e) => e.provider === 'sentry' && e.event_type === 'error_resolved');
        const hasSentry = events.some((e) => e.provider === 'sentry');
        if (!hasSentry) {
          setErrors({ value: '—', note: 'Connect Sentry' });
        } else {
          const openCount = Math.max(0, sentryErrors.length - sentryResolved.length);
          setErrors({
            value: String(openCount),
            note: openCount === 0 ? 'All clear' : `${sentryErrors.length} total, ${sentryResolved.length} resolved`,
          });
        }
      })
      .catch(() => {
        setUptime({ value: '—', note: 'Failed to load' });
        setErrors({ value: '—', note: 'Failed to load' });
      });

    // QA Pass Rate: fetch tasks
    fetch(`/api/tasks?projectId=${project.id}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) { setQaRate({ value: '—', note: 'No QA data yet' }); return; }
        const tasks = Array.isArray(data) ? data : data.tasks ?? [];
        const withQA = tasks.filter((t: { qa_checks?: Record<string, boolean> }) => t.qa_checks && Object.keys(t.qa_checks).length > 0);
        if (withQA.length === 0) {
          setQaRate({ value: '—', note: 'No QA data yet' });
        } else {
          const passed = withQA.filter((t: { qa_checks: Record<string, boolean> }) =>
            Object.values(t.qa_checks).every(Boolean)
          ).length;
          const pct = Math.round((passed / withQA.length) * 100);
          setQaRate({ value: `${pct}%`, note: `${passed}/${withQA.length} tasks passed` });
        }
      })
      .catch(() => setQaRate({ value: '—', note: 'No QA data yet' }));
  }, [project.id]);

  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
          Project Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetaRow label="Project Name" value={project.name} />
          <MetaRow label="Client Name" value={project.client_name ?? '—'} />
          <MetaRow
            label="Client URL"
            value={project.client_slug ? `/client/${project.client_slug}` : '—'}
          />
          <MetaRow
            label="Created"
            value={new Date(project.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          />
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
          Health Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Uptime (30d)" value={uptime.value} note={uptime.note} />
          <MetricCard label="Open Errors" value={errors.value} note={errors.note} />
          <MetricCard label="QA Pass Rate" value={qaRate.value} note={qaRate.note} />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────── Settings Tab */

function SettingsTab({
  project,
  initialBlockers,
  initialChangeRequests,
}: {
  project: Project;
  initialBlockers: Blocker[];
  initialChangeRequests: ChangeRequest[];
}) {
  return (
    <div className="space-y-10">
      <TimelineBudgetSection project={project} />
      <ClientAccessSection
        projectId={project.id}
        clientSlug={project.client_slug}
        clientName={project.client_name}
      />
      <BlockersSection projectId={project.id} initialBlockers={initialBlockers} />
      <ChangeRequestsSection projectId={project.id} initialChangeRequests={initialChangeRequests} />
    </div>
  );
}

/* ── Section A: Timeline & Budget ── */

function TimelineBudgetSection({ project }: { project: Project }) {
  const [startDate, setStartDate] = useState(project.start_date ?? '');
  const [targetEndDate, setTargetEndDate] = useState(project.target_end_date ?? '');
  const [budgetHours, setBudgetHours] = useState(project.budget_hours ?? 0);
  const [usedHours, setUsedHours] = useState(project.used_hours ?? 0);
  const [nextMilestone, setNextMilestone] = useState(project.next_milestone ?? '');
  const [nextMilestoneDate, setNextMilestoneDate] = useState(project.next_milestone_date ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: project.id,
          start_date: startDate || null,
          target_end_date: targetEndDate || null,
          budget_hours: budgetHours || 0,
          used_hours: usedHours || 0,
          next_milestone: nextMilestone.trim() || null,
          next_milestone_date: nextMilestoneDate || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
        Timeline &amp; Budget
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <FieldGroup label="Start Date">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30" />
        </FieldGroup>
        <FieldGroup label="Target End Date">
          <input type="date" value={targetEndDate} onChange={(e) => setTargetEndDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30" />
        </FieldGroup>
        <FieldGroup label="Budget Hours">
          <input type="number" value={budgetHours} onChange={(e) => setBudgetHours(Number(e.target.value))} className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30" />
        </FieldGroup>
        <FieldGroup label="Used Hours">
          <input type="number" value={usedHours} onChange={(e) => setUsedHours(Number(e.target.value))} className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30" />
        </FieldGroup>
        <FieldGroup label="Next Milestone">
          <input type="text" value={nextMilestone} onChange={(e) => setNextMilestone(e.target.value)} placeholder="e.g. Beta launch" className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" />
        </FieldGroup>
        <FieldGroup label="Next Milestone Date">
          <input type="date" value={nextMilestoneDate} onChange={(e) => setNextMilestoneDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30" />
        </FieldGroup>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {saved && <span className="text-emerald-400 text-sm">Saved!</span>}
      </div>
    </div>
  );
}

/* ── Section: Client Access ── */

function ClientAccessSection({
  projectId,
  clientSlug,
  clientName,
}: {
  projectId: string;
  clientSlug: string | null;
  clientName: string | null;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSetPassword, setLastSetPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const dashboardUrl = clientSlug
    ? `https://mission-control.truetechpro.io/client/${clientSlug}`
    : null;

  async function handleReset() {
    if (!newPassword.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          client_password: newPassword.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed to reset password');
      setLastSetPassword(newPassword.trim());
      setNewPassword('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError('Failed to reset password. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function handleCopy() {
    if (!dashboardUrl || !lastSetPassword) return;
    const name = clientName ?? 'there';
    const message = `Hi ${name} 👋\n\nYour Mission Control dashboard is ready!\n\n🔗 Dashboard: ${dashboardUrl}\n🔑 Password: ${lastSetPassword}\n\nLet me know if you have any questions.\n\n— True Tech Professionals`;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-5">
      <div>
        <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">
          Client Dashboard Access
        </h2>
        <p className="text-white/30 text-xs">
          All client stakeholders use a single shared password to access the dashboard.
        </p>
      </div>

      {/* Dashboard URL display */}
      {dashboardUrl && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg">
          <span className="text-white/30 text-xs">🔗</span>
          <span className="text-white/60 text-sm font-mono">{dashboardUrl}</span>
        </div>
      )}

      {/* Reset password row */}
      <div className="flex items-center gap-2">
        <input
          type="password"
          placeholder="Set new password..."
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleReset()}
          className="w-64 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
        />
        <button
          onClick={handleReset}
          disabled={saving || !newPassword.trim()}
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Set Password'}
        </button>
        {saved && <span className="text-emerald-400 text-sm">Saved!</span>}
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>

      {/* Copy to clipboard — only visible after password is set this session */}
      {lastSetPassword && dashboardUrl && (
        <div className="border border-white/10 rounded-lg p-4 space-y-3 bg-white/[0.02]">
          <p className="text-white/40 text-xs">
            Password set. Copy the access details to send to your client — this will not be shown again after you leave this page.
          </p>
          <div className="font-mono text-xs text-white/50 whitespace-pre-wrap leading-relaxed">
            {`Hi ${clientName ?? 'there'} 👋\n\nYour Mission Control dashboard is ready!\n\n🔗 Dashboard: ${dashboardUrl}\n🔑 Password: ${lastSetPassword}\n\nLet me know if you have any questions.\n\n— True Tech Professionals`}
          </div>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium rounded-lg hover:bg-emerald-500/30 transition-colors"
          >
            {copied ? '✓ Copied!' : '📋 Copy Access Details'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Section B: Blockers ── */

function BlockersSection({
  projectId,
  initialBlockers,
}: {
  projectId: string;
  initialBlockers: Blocker[];
}) {
  const [blockers, setBlockers] = useState<Blocker[]>(initialBlockers);
  const [title, setTitle] = useState('');
  const [waitingOn, setWaitingOn] = useState<'client' | 'team'>('client');
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!title.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/blockers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, title: title.trim(), waiting_on: waitingOn }),
      });
      if (!res.ok) throw new Error('Failed to add blocker');
      const created: Blocker = await res.json();
      setBlockers((prev) => [created, ...prev]);
      setTitle('');
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  }

  async function handleResolve(id: string) {
    setBlockers((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'resolved' } : b))
    );
    try {
      await fetch('/api/blockers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'resolved' }),
      });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
        Blockers
      </h2>

      {blockers.length === 0 && (
        <p className="text-white/30 text-sm mb-4">No blockers yet.</p>
      )}

      <div className="space-y-2 mb-4">
        {blockers.map((b) => (
          <div key={b.id} className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] rounded-lg border border-white/10">
            <span className="text-white text-sm flex-1">{b.title}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/50">
              {b.waiting_on}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                b.status === 'open'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-white/10 text-white/40'
              }`}
            >
              {b.status}
            </span>
            {b.status === 'open' && (
              <button
                onClick={() => handleResolve(b.id)}
                className="text-xs px-2.5 py-1 rounded-md border border-white/10 text-white/40 hover:text-emerald-400 hover:border-emerald-400/30 transition-colors"
              >
                Resolve
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Blocker title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
        />
        <select
          value={waitingOn}
          onChange={(e) => setWaitingOn(e.target.value as 'client' | 'team')}
          className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
        >
          <option value="client" className="bg-[#111]">Client</option>
          <option value="team" className="bg-[#111]">Team</option>
        </select>
        <button
          onClick={handleAdd}
          disabled={adding}
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {adding ? 'Adding...' : 'Add'}
        </button>
      </div>
    </div>
  );
}

/* ── Section C: Change Requests ── */

function ChangeRequestsSection({
  projectId,
  initialChangeRequests,
}: {
  projectId: string;
  initialChangeRequests: ChangeRequest[];
}) {
  const [requests, setRequests] = useState<ChangeRequest[]>(initialChangeRequests);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hoursImpact, setHoursImpact] = useState(0);
  const [crStatus, setCrStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!title.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          status: crStatus,
          hours_impact: hoursImpact,
        }),
      });
      if (!res.ok) throw new Error('Failed to add change request');
      const created: ChangeRequest = await res.json();
      setRequests((prev) => [created, ...prev]);
      setTitle('');
      setDescription('');
      setHoursImpact(0);
      setCrStatus('pending');
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    try {
      await fetch('/api/change-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
    } catch (err) {
      console.error(err);
    }
  }

  const CR_STATUS_STYLE: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300',
    approved: 'bg-emerald-500/20 text-emerald-300',
    rejected: 'bg-red-500/20 text-red-300',
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
        Change Requests
      </h2>

      {requests.length === 0 && (
        <p className="text-white/30 text-sm mb-4">No change requests yet.</p>
      )}

      <div className="space-y-2 mb-4">
        {requests.map((cr) => (
          <div key={cr.id} className="px-4 py-3 bg-white/[0.03] rounded-lg border border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-white text-sm flex-1">{cr.title}</span>
              <span className="text-white/30 text-xs">+{cr.hours_impact} hrs</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  CR_STATUS_STYLE[cr.status] ?? CR_STATUS_STYLE.pending
                }`}
              >
                {cr.status}
              </span>
              {cr.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleStatusChange(cr.id, 'approved')}
                    className="text-xs px-2.5 py-1 rounded-md border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange(cr.id, 'rejected')}
                    className="text-xs px-2.5 py-1 rounded-md border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
            {cr.description && (
              <p className="text-white/30 text-xs mt-1.5">{cr.description}</p>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Change request title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
          <input
            type="number"
            placeholder="Hours"
            value={hoursImpact || ''}
            onChange={(e) => setHoursImpact(Number(e.target.value))}
            className="w-20 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
          <select
            value={crStatus}
            onChange={(e) => setCrStatus(e.target.value as 'pending' | 'approved' | 'rejected')}
            className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
          >
            <option value="pending" className="bg-[#111]">Pending</option>
            <option value="approved" className="bg-[#111]">Approved</option>
            <option value="rejected" className="bg-[#111]">Rejected</option>
          </select>
        </div>
        <textarea
          placeholder="Description (optional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none"
        />
        <button
          onClick={handleAdd}
          disabled={adding}
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {adding ? 'Adding...' : 'Add'}
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────── Shared Components */

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-white/30 text-xs mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-white/30 text-xs mb-1">{label}</p>
      <p className="text-white text-sm font-medium">{value}</p>
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-4">
      <p className="text-white/30 text-xs mb-2">{label}</p>
      <p className="text-white text-2xl font-bold mb-1">{value}</p>
      <p className="text-white/20 text-xs">{note}</p>
    </div>
  );
}
