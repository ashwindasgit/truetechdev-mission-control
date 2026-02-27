'use client';

import { useState } from 'react';
import Link from 'next/link';
import EventFeed from '@/components/admin/EventFeed';

interface Project {
  id: string;
  name: string;
  status: string;
  client_name: string | null;
  client_slug: string | null;
  created_at: string;
  start_date: string | null;
  target_end_date: string | null;
  budget_hours: number | null;
  used_hours: number | null;
  next_milestone: string | null;
  next_milestone_date: string | null;
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

const TABS = [
  { label: 'Overview', href: null },
  { label: 'Tasks', href: 'tasks' },
  { label: 'Feed', href: null },
  { label: 'Settings', href: null },
];

export default function ProjectTabs({ project, projectId, blockers, changeRequests }: Props) {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div>
      <div className="flex gap-1 border-b border-white/10 mb-8">
        {TABS.map((tab) =>
          tab.href ? (
            <Link
              key={tab.label}
              href={`/admin/projects/${projectId}/${tab.href}`}
              className="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px text-white/40 border-transparent hover:text-white/70"
            >
              {tab.label}
            </Link>
          ) : (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.label
                  ? 'text-white border-white'
                  : 'text-white/40 border-transparent hover:text-white/70'
              }`}
            >
              {tab.label}
            </button>
          )
        )}
      </div>

      {activeTab === 'Overview' && <OverviewTab project={project} />}
      {activeTab === 'Feed' && <EventFeed projectId={project.id} />}
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
          <MetricCard label="Uptime (30d)" value="—" note="Connect Better Uptime" />
          <MetricCard label="Open Errors" value="—" note="Connect Sentry" />
          <MetricCard label="QA Pass Rate" value="—" note="Add tasks to track" />
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
