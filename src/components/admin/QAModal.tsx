'use client';

import { useState } from 'react';

const QA_ITEMS: { key: string; label: string }[] = [
  { key: 'feature_works', label: 'Feature works as described' },
  { key: 'no_console_errors', label: 'No console errors' },
  { key: 'mobile_responsive', label: 'Mobile responsive' },
  { key: 'loading_states', label: 'Loading states implemented' },
  { key: 'error_states', label: 'Error states handled' },
  { key: 'no_hardcoded_data', label: 'No hardcoded test data' },
  { key: 'env_vars_correct', label: 'Environment variables used correctly' },
  { key: 'rls_checked', label: 'Supabase RLS policies checked' },
  { key: 'api_status_codes', label: 'API routes return correct status codes' },
  { key: 'no_any_types', label: 'TypeScript — no any types' },
  { key: 'eslint_passes', label: 'ESLint passes' },
  { key: 'tested_production', label: 'Tested on production URL' },
];

interface QAModalProps {
  taskId: string;
  taskTitle: string;
  initialChecks: Record<string, boolean>;
  onClose: () => void;
}

export default function QAModal({ taskId, taskTitle, initialChecks, onClose }: QAModalProps) {
  const [checks, setChecks] = useState<Record<string, boolean>>(initialChecks);
  const [saving, setSaving] = useState(false);

  const passed = QA_ITEMS.filter((item) => checks[item.key]).length;

  async function toggleCheck(key: string) {
    const updated = { ...checks, [key]: !checks[key] };
    setChecks(updated);
    setSaving(true);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qa_checks: updated }),
      });
    } catch (err) {
      console.error(err);
      setChecks(checks);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-[#111] border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-white font-semibold">QA Checklist</h3>
          {saving && <span className="text-white/30 text-xs">Saving...</span>}
        </div>
        <p className="text-white/40 text-sm mb-5">{taskTitle}</p>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-white/50 text-xs">{passed} / 12 passed</span>
            <span className="text-white/50 text-xs">{Math.round((passed / 12) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${(passed / 12) * 100}%` }}
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {QA_ITEMS.map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={!!checks[item.key]}
                onChange={() => toggleCheck(item.key)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 accent-emerald-500"
              />
              <span
                className={`text-sm ${
                  checks[item.key] ? 'text-white/30 line-through' : 'text-white'
                }`}
              >
                {item.label}
              </span>
            </label>
          ))}
        </div>

        {/* Done button */}
        <button
          onClick={onClose}
          className="mt-5 w-full px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
