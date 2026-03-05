'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Pencil, KeyRound } from 'lucide-react';

interface Developer {
  id: string;
  name: string;
  email: string;
  github_username: string;
  slug: string;
  stacks: string[];
  status: string;
  created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  paused: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  offboarded: 'bg-red-500/15 text-red-400 border-red-500/20',
};

export default function DeveloperList({ developers: initial }: { developers: Developer[] }) {
  const [developers, setDevelopers] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', github_username: '', stacks: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetForm, setResetForm] = useState({ password: '', confirm: '' });
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const router = useRouter();

  function handleCopySlug(slug: string) {
    navigator.clipboard.writeText(`https://mission-control.truetechpro.io/dev/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  function startEdit(dev: Developer) {
    setEditingId(dev.id);
    setEditForm({
      name: dev.name,
      email: dev.email,
      github_username: dev.github_username,
      stacks: dev.stacks?.join(', ') ?? '',
    });
    setEditError(null);
    setResetId(null);
  }

  async function handleEditSave(id: string) {
    setLoading(`edit-${id}`);
    setEditError(null);
    const res = await fetch(`/api/developers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        github_username: editForm.github_username.trim(),
        stacks: editForm.stacks.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    });
    if (res.ok) {
      const updated: Developer = await res.json();
      setDevelopers((prev) => prev.map((d) => (d.id === id ? updated : d)));
      setEditingId(null);
    } else {
      const body = await res.json();
      setEditError(body.error ?? 'Failed to update');
    }
    setLoading(null);
  }

  async function handleResetPassword(id: string) {
    if (resetForm.password !== resetForm.confirm) {
      setResetError('Passwords do not match');
      return;
    }
    if (!resetForm.password.trim()) {
      setResetError('Password is required');
      return;
    }
    setLoading(`reset-${id}`);
    setResetError(null);
    const res = await fetch(`/api/developers/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: resetForm.password.trim() }),
    });
    if (res.ok) {
      setResetMsg(id);
      setTimeout(() => { setResetMsg(null); setResetId(null); setResetForm({ password: '', confirm: '' }); }, 2000);
    } else {
      const body = await res.json();
      setResetError(body.error ?? 'Failed to reset password');
    }
    setLoading(null);
  }

  const [form, setForm] = useState({
    name: '',
    email: '',
    github_username: '',
    slug: '',
    stacks: '',
    password: '',
  });

  function handleNameChange(value: string) {
    setForm((f) => ({
      ...f,
      name: value,
      slug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setLoading('form');

    const res = await fetch('/api/developers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        github_username: form.github_username,
        slug: form.slug,
        stacks: form.stacks
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        password: form.password,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setFormError(body.error ?? 'Failed to create developer');
      setLoading(null);
      return;
    }

    const newDev: Developer = await res.json();
    setDevelopers((prev) => [newDev, ...prev]);
    setForm({ name: '', email: '', github_username: '', slug: '', stacks: '', password: '' });
    setShowForm(false);
    setLoading(null);
    router.refresh();
  }

  async function handleOffboard(id: string) {
    if (!confirm('Are you sure? This will lock their access immediately.')) return;

    setLoading(id);
    const res = await fetch(`/api/developers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'offboarded' }),
    });

    if (res.ok) {
      const updated: Developer = await res.json();
      setDevelopers((prev) => prev.map((d) => (d.id === id ? updated : d)));
      router.refresh();
    }
    setLoading(null);
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Developers</h1>
          <p className="text-white/40 text-sm mt-1">Manage your development team</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Developer'}
        </button>
      </div>

      {/* Inline Add Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Slug</label>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30"
                placeholder="jane-smith"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30"
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">GitHub Username</label>
              <input
                type="text"
                required
                value={form.github_username}
                onChange={(e) => setForm((f) => ({ ...f, github_username: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30"
                placeholder="janesmith"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Stacks (comma-separated)</label>
              <input
                type="text"
                value={form.stacks}
                onChange={(e) => setForm((f) => ({ ...f, stacks: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30"
                placeholder="React, Node.js, Python"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30"
                placeholder="••••••••"
              />
            </div>
          </div>

          {formError && <p className="text-red-400 text-sm">{formError}</p>}

          <button
            type="submit"
            disabled={loading === 'form'}
            className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'form' ? 'Creating...' : 'Create Developer'}
          </button>
        </form>
      )}

      {/* Empty State */}
      {developers.length === 0 && (
        <div className="text-center py-20">
          <p className="text-white/30 text-sm">No developers yet.</p>
        </div>
      )}

      {/* Table */}
      {developers.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-white/40 font-medium text-xs uppercase tracking-wider hidden md:table-cell">GitHub</th>
                <th className="text-left px-6 py-3 text-white/40 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Slug</th>
                <th className="text-left px-6 py-3 text-white/40 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Stacks</th>
                <th className="text-left px-6 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {developers.map((dev) => (
                <React.Fragment key={dev.id}>
                <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{dev.name}</td>
                  <td className="px-6 py-4 text-white/60">{dev.email}</td>
                  <td className="px-6 py-4 text-white/60 hidden md:table-cell">{dev.github_username}</td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <button
                      onClick={() => handleCopySlug(dev.slug)}
                      className="flex items-center gap-1.5 text-white/40 hover:text-white cursor-pointer transition-colors"
                    >
                      {copiedSlug === dev.slug ? (
                        <span className="text-emerald-400 text-xs">Copied!</span>
                      ) : (
                        <>
                          <span>{dev.slug}</span>
                          <Copy size={12} className="text-white/20" />
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-white/40 hidden lg:table-cell">
                    {dev.stacks?.length > 0 ? dev.stacks.join(', ') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                        STATUS_BADGE[dev.status] ?? 'bg-white/10 text-white/40 border-white/10'
                      }`}
                    >
                      {dev.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {(dev.status === 'active' || dev.status === 'paused') && (
                        <>
                          <button
                            onClick={() => startEdit(dev)}
                            className="p-1.5 rounded-lg border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => { setResetId(resetId === dev.id ? null : dev.id); setEditingId(null); setResetForm({ password: '', confirm: '' }); setResetError(null); setResetMsg(null); }}
                            className="p-1.5 rounded-lg border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound size={13} />
                          </button>
                          <button
                            onClick={() => handleOffboard(dev.id)}
                            disabled={loading === dev.id}
                            className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400/60 text-xs font-medium hover:text-red-400 hover:border-red-500/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {loading === dev.id ? '...' : 'Offboard'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                {/* Edit inline form */}
                {editingId === dev.id && (
                  <tr className="border-b border-white/5">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-white/40 mb-1">Name</label>
                            <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30" />
                          </div>
                          <div>
                            <label className="block text-xs text-white/40 mb-1">Email</label>
                            <input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className="w-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30" />
                          </div>
                          <div>
                            <label className="block text-xs text-white/40 mb-1">GitHub Username</label>
                            <input type="text" value={editForm.github_username} onChange={(e) => setEditForm((f) => ({ ...f, github_username: e.target.value }))} className="w-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30" />
                          </div>
                          <div>
                            <label className="block text-xs text-white/40 mb-1">Stacks (comma-separated)</label>
                            <input type="text" value={editForm.stacks} onChange={(e) => setEditForm((f) => ({ ...f, stacks: e.target.value }))} className="w-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30" />
                          </div>
                        </div>
                        {editError && <p className="text-red-400 text-xs">{editError}</p>}
                        <div className="flex gap-2">
                          <button onClick={() => handleEditSave(dev.id)} disabled={loading === `edit-${dev.id}`} className="px-3 py-1.5 text-xs font-medium bg-white text-black rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50">
                            {loading === `edit-${dev.id}` ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-white/40 hover:text-white/60 transition-colors">Cancel</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {/* Reset password inline form */}
                {resetId === dev.id && (
                  <tr className="border-b border-white/5">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3 max-w-md">
                        {resetMsg === dev.id ? (
                          <p className="text-emerald-400 text-sm font-medium">Password updated ✓</p>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-white/40 mb-1">New Password</label>
                                <input type="password" value={resetForm.password} onChange={(e) => setResetForm((f) => ({ ...f, password: e.target.value }))} className="w-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30" />
                              </div>
                              <div>
                                <label className="block text-xs text-white/40 mb-1">Confirm Password</label>
                                <input type="password" value={resetForm.confirm} onChange={(e) => setResetForm((f) => ({ ...f, confirm: e.target.value }))} className="w-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30" />
                              </div>
                            </div>
                            {resetError && <p className="text-red-400 text-xs">{resetError}</p>}
                            <div className="flex gap-2">
                              <button onClick={() => handleResetPassword(dev.id)} disabled={loading === `reset-${dev.id}`} className="px-3 py-1.5 text-xs font-medium bg-white text-black rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50">
                                {loading === `reset-${dev.id}` ? 'Resetting...' : 'Reset Password'}
                              </button>
                              <button onClick={() => { setResetId(null); setResetForm({ password: '', confirm: '' }); setResetError(null); }} className="px-3 py-1.5 text-xs text-white/40 hover:text-white/60 transition-colors">Cancel</button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
