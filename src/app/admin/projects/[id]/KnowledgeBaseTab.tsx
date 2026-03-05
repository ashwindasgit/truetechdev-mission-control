'use client';

import { useState, useEffect } from 'react';

interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  file_paths: string[];
  confidence: number;
  created_at: string;
  audit_id: string | null;
  developer_id: string | null;
}

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'integration', label: 'Integration' },
  { value: 'env_config', label: 'Env Config' },
  { value: 'pattern', label: 'Pattern' },
  { value: 'decision', label: 'Decision' },
  { value: 'dependency', label: 'Dependency' },
  { value: 'gotcha', label: 'Gotcha' },
];

const CATEGORY_STYLE: Record<string, string> = {
  architecture: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  integration: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  env_config: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  pattern: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  decision: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  dependency: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  gotcha: 'bg-red-500/15 text-red-400 border-red-500/20',
};

export default function KnowledgeBaseTab({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategory) params.set('category', activeCategory);
    if (search.trim()) params.set('search', search.trim());
    const qs = params.toString();

    fetch(`/api/knowledge/${projectId}${qs ? `?${qs}` : ''}`)
      .then((res) => res.json())
      .then((data) => setEntries(data.entries ?? []))
      .catch((err) => console.error('Knowledge fetch error:', err))
      .finally(() => setLoading(false));
  }, [projectId, activeCategory, search]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === cat.value
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/70'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search knowledge entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
        />
      </div>

      {/* Entries */}
      {loading ? (
        <p className="text-white/30 text-sm py-8 text-center">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/30 text-sm">
            No knowledge entries yet. They are extracted automatically from PR audits.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                    CATEGORY_STYLE[entry.category] ?? 'bg-white/10 text-white/50 border-white/10'
                  }`}
                >
                  {entry.category.replace('_', ' ')}
                </span>
                <span className="text-white/20 text-[10px]">
                  {Math.round(entry.confidence * 100)}% confidence
                </span>
              </div>
              <h3 className="text-white text-sm font-medium">{entry.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{entry.content}</p>
              {entry.file_paths.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entry.file_paths.map((fp) => (
                    <span
                      key={fp}
                      className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-white/40"
                    >
                      {fp}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-white/20 text-[10px]">
                {new Date(entry.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
