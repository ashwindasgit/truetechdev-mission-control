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
}

interface Props {
  project: Project;
  projectId: string;
}

const TABS = [
  { label: 'Overview', href: null },
  { label: 'Tasks', href: 'tasks' },
  { label: 'Feed', href: null },
  { label: 'Settings', href: null },
];

export default function ProjectTabs({ project, projectId }: Props) {
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
      {activeTab === 'Settings' && <ComingSoon label="Settings" />}
    </div>
  );
}

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

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="text-center py-20">
      <p className="text-white/20 text-sm">{label} — coming soon</p>
    </div>
  );
}
