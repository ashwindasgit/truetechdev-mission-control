'use client';

import { useEffect, useState } from 'react';

interface EventMetadata {
  url?: string;
  issue_url?: string;
  repo_url?: string;
  [key: string]: unknown;
}

interface Event {
  id: string;
  project_id: string;
  provider: string;
  event_type: string;
  severity: string;
  title: string;
  metadata: EventMetadata;
  created_at: string;
}

type Provider = 'all' | 'github' | 'sentry' | 'vercel' | 'betteruptime';

const FILTERS: { label: string; value: Provider }[] = [
  { label: 'All', value: 'all' },
  { label: 'GitHub', value: 'github' },
  { label: 'Sentry', value: 'sentry' },
  { label: 'Vercel', value: 'vercel' },
  { label: 'Uptime', value: 'betteruptime' },
];

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

function SkeletonCard() {
  return (
    <div className="flex items-start gap-3 px-4 py-4 bg-white/5 rounded-lg border border-white/10 animate-pulse">
      <div className="w-5 h-5 rounded bg-white/10 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/10 rounded w-1/3" />
      </div>
    </div>
  );
}

export default function EventFeed({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Provider>('all');

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch(`/api/events?projectId=${projectId}`);
        if (!res.ok) throw new Error('Failed to fetch events');
        const data = await res.json();
        setEvents(data.events ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [projectId]);

  const filtered = filter === 'all'
    ? events
    : events.filter((e) => e.provider === filter);

  return (
    <div>
      {/* Filter bar */}
      <div className="flex gap-1 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === f.value
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/40 hover:text-white/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-white/40 text-sm">No events yet.</p>
        </div>
      )}

      {/* Event list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((event) => {
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
                    <span className="text-white/30 text-xs">{timeAgo(event.created_at)}</span>
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
    </div>
  );
}
