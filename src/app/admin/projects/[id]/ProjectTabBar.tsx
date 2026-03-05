'use client';

import Link from 'next/link';

const TABS = [
  { label: 'Overview', href: '' },
  { label: 'Tasks', href: '/tasks' },
  { label: 'Feed', href: '?tab=feed' },
  { label: 'Knowledge Base', href: '?tab=knowledge' },
  { label: 'Settings', href: '?tab=settings' },
];

export default function ProjectTabBar({
  projectId,
  activeTab,
}: {
  projectId: string;
  activeTab: string;
}) {
  const base = `/admin/projects/${projectId}`;

  return (
    <div className="flex gap-1 border-b border-white/10 mb-8">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.label;
        return (
          <Link
            key={tab.label}
            href={`${base}${tab.href}`}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive
                ? 'text-white border-white'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
