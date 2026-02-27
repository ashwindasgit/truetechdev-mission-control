'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  slug: string;
  projectName: string;
}

export default function ClientLoginForm({ slug, projectName }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/client/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password }),
      });

      if (!res.ok) {
        setError('Incorrect password');
        setLoading(false);
        return;
      }

      router.push(`/client/${slug}/dashboard`);
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      <h1 className="text-2xl font-bold text-white text-center mb-2">
        {projectName}
      </h1>
      <p className="text-white/40 text-sm text-center mb-8">
        Enter your password to view the dashboard
      </p>

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 mb-3"
      />

      {error && (
        <p className="text-red-400 text-sm mb-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !password}
        className="w-full px-4 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
