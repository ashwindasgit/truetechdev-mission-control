'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Converts a project name into a URL-safe slug
// "Acme Corp App" → "acme-corp-app"
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function NewProjectPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    client_name: '',
    client_slug: '',
    client_password: '',
  });

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setForm((prev) => ({
      ...prev,
      name,
      // Only auto-generate slug if user hasn't manually edited it
      client_slug: slugManuallyEdited ? prev.client_slug : generateSlug(name),
    }));
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugManuallyEdited(true);
    setForm((prev) => ({ ...prev, client_slug: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic client-side validation
    if (!form.name.trim()) {
      setError('Project name is required.');
      return;
    }
    if (!form.client_slug.trim()) {
      setError('Client slug is required.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setLoading(false);
        return;
      }

      // Success — go back to projects list
      router.push('/admin');
      router.refresh();

    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-xl">

      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="text-white/40 text-sm hover:text-white transition-colors"
        >
          ← Back to Projects
        </Link>
        <h1 className="text-2xl font-bold text-white mt-3">New Project</h1>
        <p className="text-white/40 text-sm mt-1">
          Create a project to start tracking a client engagement.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Project Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">
            Project Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={handleNameChange}
            placeholder="e.g. Acme Corp App"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>

        {/* Client Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">
            Client Name
          </label>
          <input
            type="text"
            value={form.client_name}
            onChange={(e) => setForm((prev) => ({ ...prev, client_name: e.target.value }))}
            placeholder="e.g. Acme Corp"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>

        {/* Client Slug */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">
            Client URL Slug <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-white/30 text-sm whitespace-nowrap">/client/</span>
            <input
              type="text"
              value={form.client_slug}
              onChange={handleSlugChange}
              placeholder="acme-corp"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <p className="text-white/25 text-xs">
            Auto-generated from project name. Must be unique.
          </p>
        </div>

        {/* Client Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">
            Client Dashboard Password
          </label>
          <input
            type="text"
            value={form.client_password}
            onChange={(e) => setForm((prev) => ({ ...prev, client_password: e.target.value }))}
            placeholder="e.g. launch2026"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
          />
          <p className="text-white/25 text-xs">
            Clients use this to access their dashboard at /client/[slug].
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
          <Link
            href="/admin"
            className="px-5 py-2.5 text-white/50 text-sm font-medium hover:text-white transition-colors"
          >
            Cancel
          </Link>
        </div>

      </form>
    </div>
  );
}
