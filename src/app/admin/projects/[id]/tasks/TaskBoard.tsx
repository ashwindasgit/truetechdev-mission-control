'use client';

import { useState, useEffect } from 'react';
import { Trash2, List } from 'lucide-react';
import QAModal from '@/components/admin/QAModal';

/* ────────────────────────────────── Types */

interface PrAudit {
  id: string;
  project_id: string;
  pr_number: number;
  repo_url: string;
  audit_summary: string;
  confidence_score: number;
  passed: boolean;
  issues: string[];
  raw_pr_title: string | null;
  raw_pr_author: string | null;
  created_at: string;
}

interface Developer {
  id: string;
  name: string;
  github_username: string;
  status: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  pr_url: string | null;
  position: number;
  qa_checks: Record<string, boolean>;
  developer_id: string | null;
  acceptance_criteria: string[];
  linked_pr_numbers: number[];
}

interface Module {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
}

interface TaskBoardProps {
  projectId: string;
  initialModules: Module[];
  developers: Developer[];
  repoUrl: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  backlog:  { label: 'Backlog',  classes: 'bg-white/10 text-white/40' },
  in_dev:   { label: 'In Dev',   classes: 'bg-blue-500/20 text-blue-300' },
  in_qa:    { label: 'In QA',    classes: 'bg-yellow-500/20 text-yellow-300' },
  approved: { label: 'Approved', classes: 'bg-purple-500/20 text-purple-300' },
  deployed: { label: 'Deployed', classes: 'bg-emerald-500/20 text-emerald-300' },
  failed:   { label: 'Failed',   classes: 'bg-red-500/20 text-red-300' },
};

/* ────────────────────────────────── TaskRow */

function TaskRow({
  task,
  developers,
  isExpanded,
  onStatusChange,
  onDeveloperChange,
  onQAClick,
  onRename,
  onDelete,
  onToggleExpand,
}: {
  task: Task;
  developers: Developer[];
  isExpanded: boolean;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onDeveloperChange: (taskId: string, developerId: string | null) => void;
  onQAClick: (task: Task) => void;
  onRename: (taskId: string, newTitle: string) => void;
  onDelete: (taskId: string) => void;
  onToggleExpand: (taskId: string) => void;
}) {
  const status = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.backlog;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const activeDevelopers = developers.filter((d) => d.status === 'active');

  return (
    <div className={`group flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 ${isExpanded ? 'rounded-t-lg border-b-0' : 'rounded-lg'}`}>
      {/* Status select */}
      <select
        value={task.status}
        onChange={(e) => onStatusChange(task.id, e.target.value)}
        className={`px-2.5 py-0.5 rounded-full text-xs font-medium appearance-none cursor-pointer border-0 outline-none ${status.classes}`}
      >
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <option key={key} value={key} className="bg-[#111] text-white">
            {cfg.label}
          </option>
        ))}
      </select>

      {/* Developer assignment select */}
      <select
        value={task.developer_id ?? ''}
        onChange={(e) => onDeveloperChange(task.id, e.target.value || null)}
        className={`px-2.5 py-0.5 rounded-full text-xs font-medium appearance-none cursor-pointer border-0 outline-none ${
          task.developer_id ? 'bg-white/10 text-white/70' : 'bg-white/10 text-white/50'
        }`}
      >
        <option value="" className="bg-[#111] text-white">Unassigned</option>
        {activeDevelopers.map((dev) => (
          <option key={dev.id} value={dev.id} className="bg-[#111] text-white">
            {dev.name}
          </option>
        ))}
      </select>

      {/* Title */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              onRename(task.id, draft.trim());
              setEditing(false);
            }
            if (e.key === 'Escape') {
              setDraft(task.title);
              setEditing(false);
            }
          }}
          onBlur={() => { setDraft(task.title); setEditing(false); }}
          className="flex-1 px-2 py-0.5 text-sm bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:border-white/40"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className="text-white text-sm flex-1 cursor-pointer hover:text-white/70 transition-colors"
        >
          {task.title}
        </span>
      )}

      {task.pr_url && (
        <a
          href={task.pr_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          PR &rarr;
        </a>
      )}

      {/* Expand button */}
      <button
        onClick={() => onToggleExpand(task.id)}
        className={`text-xs px-1.5 py-1 rounded-md border transition-colors ${
          isExpanded
            ? 'border-white/20 text-white/60'
            : 'border-white/10 text-white/30 hover:text-white/50 hover:border-white/20'
        }`}
        title="Details"
      >
        <List size={14} />
      </button>

      <button
        onClick={() => onQAClick(task)}
        className="text-xs px-2.5 py-1 rounded-md border border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 transition-colors"
      >
        QA
      </button>
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

/* ────────────────────────────────── TaskExpandedPanel */

function TaskExpandedPanel({
  task,
  repoUrl,
  auditMap,
  onUpdateCriteria,
  onUpdatePRs,
}: {
  task: Task;
  repoUrl: string | null;
  auditMap: Record<number, PrAudit>;
  onUpdateCriteria: (taskId: string, criteria: string[]) => void;
  onUpdatePRs: (taskId: string, prs: number[]) => void;
}) {
  const [newCriterion, setNewCriterion] = useState('');
  const [newPR, setNewPR] = useState('');
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [expandedAudit, setExpandedAudit] = useState<number | null>(null);

  function toggleCheck(idx: number) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function handleAddCriterion() {
    if (!newCriterion.trim()) return;
    const updated = [...(task.acceptance_criteria ?? []), newCriterion.trim()];
    onUpdateCriteria(task.id, updated);
    setNewCriterion('');
  }

  function handleAddPR() {
    const num = parseInt(newPR, 10);
    if (!num || num <= 0) return;
    const updated = [...(task.linked_pr_numbers ?? []), num];
    onUpdatePRs(task.id, updated);
    setNewPR('');
  }

  // Strip trailing slash from repoUrl for clean link construction
  const baseRepo = repoUrl?.replace(/\/+$/, '') ?? null;

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-b-lg px-4 py-3 -mt-1 space-y-4">
      {/* Acceptance Criteria */}
      <div>
        <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">
          Acceptance Criteria
        </h4>
        {(task.acceptance_criteria?.length ?? 0) === 0 && (
          <p className="text-white/20 text-xs mb-2">No criteria yet.</p>
        )}
        <div className="space-y-1 mb-2">
          {task.acceptance_criteria?.map((criterion, idx) => (
            <label key={idx} className="flex items-center gap-2 cursor-pointer group/ac">
              <input
                type="checkbox"
                checked={checkedItems.has(idx)}
                onChange={() => toggleCheck(idx)}
                className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-0 focus:ring-offset-0"
              />
              <span
                className={`text-sm transition-colors ${
                  checkedItems.has(idx)
                    ? 'text-white/30 line-through'
                    : 'text-white/70'
                }`}
              >
                {criterion}
              </span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add criterion..."
            value={newCriterion}
            onChange={(e) => setNewCriterion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCriterion()}
            className="flex-1 px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-white/30"
          />
          <button
            onClick={handleAddCriterion}
            className="px-3 py-1.5 text-xs font-medium bg-white/10 text-white/60 rounded-lg hover:bg-white/15 hover:text-white/80 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Linked PRs */}
      <div>
        <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">
          Linked PRs
        </h4>
        {(task.linked_pr_numbers?.length ?? 0) === 0 && (
          <p className="text-white/20 text-xs mb-2">No linked PRs.</p>
        )}
        <div className="space-y-2 mb-2">
          {task.linked_pr_numbers?.map((pr) => {
            const audit = auditMap[pr];
            const isAuditExpanded = expandedAudit === pr;
            return (
              <div key={pr}>
                <div className="flex items-center gap-2">
                  {baseRepo ? (
                    <a
                      href={`${baseRepo}/pull/${pr}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 bg-blue-500/15 text-blue-400 text-xs rounded-full hover:bg-blue-500/25 transition-colors"
                    >
                      #{pr}
                    </a>
                  ) : (
                    <span className="px-2 py-0.5 bg-white/10 text-white/50 text-xs rounded-full">
                      #{pr}
                    </span>
                  )}
                  {/* Audit badge */}
                  {audit ? (
                    <button
                      onClick={() => setExpandedAudit(isAuditExpanded ? null : pr)}
                      className={`px-2 py-0.5 text-xs rounded-full font-medium cursor-pointer transition-colors ${
                        audit.passed
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25'
                      }`}
                    >
                      {audit.passed ? '✅ PASSED' : '⚠️ NEEDS REVIEW'} {audit.confidence_score.toFixed(2)}
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-white/5 text-white/30 border border-white/10">
                      ⏳ Pending
                    </span>
                  )}
                </div>
                {/* Expanded audit detail */}
                {audit && isAuditExpanded && (
                  <div className="mt-1.5 ml-4 p-3 bg-white/5 border border-white/10 rounded-lg space-y-2">
                    <p className="text-white/70 text-sm">{audit.audit_summary}</p>
                    {audit.issues.length > 0 && (
                      <div>
                        <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Issues</p>
                        <ul className="space-y-0.5">
                          {audit.issues.map((issue, idx) => (
                            <li key={idx} className="text-white/50 text-xs flex items-start gap-1.5">
                              <span className="text-white/20 mt-0.5">•</span>
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-white/20 text-[10px]">
                      Audited {new Date(audit.created_at).toLocaleString()}
                      {audit.raw_pr_author && ` · by @${audit.raw_pr_author}`}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            placeholder="PR #"
            value={newPR}
            onChange={(e) => setNewPR(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPR()}
            className="w-24 px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-white/30"
          />
          <button
            onClick={handleAddPR}
            className="px-3 py-1.5 text-xs font-medium bg-white/10 text-white/60 rounded-lg hover:bg-white/15 hover:text-white/80 transition-colors"
          >
            Link PR
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────── TaskBoard (main) */

export default function TaskBoard({ projectId, initialModules, developers, repoUrl }: TaskBoardProps) {
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingTaskForModule, setAddingTaskForModule] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [qaModalTask, setQaModalTask] = useState<Task | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [devFilter, setDevFilter] = useState<string>('all');
  const [auditMap, setAuditMap] = useState<Record<number, PrAudit>>({});

  const activeDevelopers = developers.filter((d) => d.status === 'active');

  useEffect(() => {
    fetch(`/api/pr-audits/${projectId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch audits');
        return res.json();
      })
      .then((audits: PrAudit[]) => {
        const map: Record<number, PrAudit> = {};
        for (const audit of audits) {
          // Keep the most recent audit per PR number
          if (!map[audit.pr_number]) {
            map[audit.pr_number] = audit;
          }
        }
        setAuditMap(map);
      })
      .catch((err) => console.error('PR audits fetch error:', err));
  }, [projectId]);

  function toggleExpand(taskId: string) {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function filterTasks(tasks: Task[]): Task[] {
    if (devFilter === 'all') return tasks;
    if (devFilter === 'unassigned') return tasks.filter((t) => !t.developer_id);
    return tasks.filter((t) => t.developer_id === devFilter);
  }

  /* ── Handlers ── */

  async function handleStatusChange(taskId: string, newStatus: string) {
    const prev = modules;
    setModules((m) =>
      m.map((mod) => ({
        ...mod,
        tasks: mod.tasks.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        ),
      }))
    );
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
    } catch (err) {
      console.error(err);
      setModules(prev);
    }
  }

  async function handleDeveloperChange(taskId: string, developerId: string | null) {
    const prev = modules;
    setModules((m) =>
      m.map((mod) => ({
        ...mod,
        tasks: mod.tasks.map((t) =>
          t.id === taskId ? { ...t, developer_id: developerId } : t
        ),
      }))
    );
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ developer_id: developerId }),
      });
      if (!res.ok) throw new Error('Failed to assign developer');
    } catch (err) {
      console.error(err);
      setModules(prev);
    }
  }

  async function handleUpdateCriteria(taskId: string, criteria: string[]) {
    const prev = modules;
    setModules((m) =>
      m.map((mod) => ({
        ...mod,
        tasks: mod.tasks.map((t) =>
          t.id === taskId ? { ...t, acceptance_criteria: criteria } : t
        ),
      }))
    );
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptance_criteria: criteria }),
      });
      if (!res.ok) throw new Error('Failed to update criteria');
    } catch (err) {
      console.error(err);
      setModules(prev);
    }
  }

  async function handleUpdatePRs(taskId: string, prs: number[]) {
    const prev = modules;
    setModules((m) =>
      m.map((mod) => ({
        ...mod,
        tasks: mod.tasks.map((t) =>
          t.id === taskId ? { ...t, linked_pr_numbers: prs } : t
        ),
      }))
    );
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linked_pr_numbers: prs }),
      });
      if (!res.ok) throw new Error('Failed to update PRs');
    } catch (err) {
      console.error(err);
      setModules(prev);
    }
  }

  function handleQASave(taskId: string, newChecks: Record<string, boolean>) {
    setModules((m) =>
      m.map((mod) => ({
        ...mod,
        tasks: mod.tasks.map((t) =>
          t.id === taskId ? { ...t, qa_checks: newChecks } : t
        ),
      }))
    );
  }

  async function handleRenameModule(moduleId: string, newName: string) {
    const prev = modules;
    setModules((m) => m.map((mod) => mod.id === moduleId ? { ...mod, name: newName } : mod));
    try {
      const res = await fetch('/api/modules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: moduleId, name: newName }),
      });
      if (!res.ok) throw new Error('Failed to rename module');
    } catch (err) {
      console.error(err);
      setModules(prev);
    }
  }

  async function handleDeleteModule(moduleId: string) {
    if (!confirm('Delete this module? All tasks inside will also be deleted.')) return;
    const prev = modules;
    setModules((m) => m.filter((mod) => mod.id !== moduleId));
    try {
      const res = await fetch(`/api/modules?id=${moduleId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete module');
    } catch (err) {
      console.error(err);
      setModules(prev);
    }
  }

  async function handleRenameTask(taskId: string, newTitle: string) {
    const prev = modules;
    setModules((m) =>
      m.map((mod) => ({
        ...mod,
        tasks: mod.tasks.map((t) => t.id === taskId ? { ...t, title: newTitle } : t),
      }))
    );
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, title: newTitle }),
      });
      if (!res.ok) throw new Error('Failed to rename task');
    } catch (err) {
      console.error(err);
      setModules(prev);
    }
  }

  async function handleDeleteTask(taskId: string) {
    const prev = modules;
    setModules((m) =>
      m.map((mod) => ({
        ...mod,
        tasks: mod.tasks.filter((t) => t.id !== taskId),
      }))
    );
    try {
      const res = await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
    } catch (err) {
      console.error(err);
      setModules(prev);
    }
  }

  async function handleAddTask(moduleId: string) {
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, projectId, title: newTaskTitle.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create task');
      const created = await res.json();
      setModules((prev) =>
        prev.map((mod) =>
          mod.id === moduleId
            ? { ...mod, tasks: [...(mod.tasks ?? []), { ...created, acceptance_criteria: created.acceptance_criteria ?? [], linked_pr_numbers: created.linked_pr_numbers ?? [] }] }
            : mod
        )
      );
      setAddingTaskForModule(null);
      setNewTaskTitle('');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTask(false);
    }
  }

  async function handleAddModule() {
    if (!newModuleName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, name: newModuleName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create module');
      const created = await res.json();
      setModules((prev) => [...prev, { ...created, tasks: [] }]);
      setShowAddModule(false);
      setNewModuleName('');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  /* ── Render ── */

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Tasks</h2>
        {showAddModule ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              placeholder="Module name..."
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddModule()}
              className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
            <button
              onClick={handleAddModule}
              disabled={saving}
              className="px-3 py-1.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setShowAddModule(false); setNewModuleName(''); }}
              className="px-3 py-1.5 text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddModule(true)}
            className="px-3 py-1.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
          >
            + Add Module
          </button>
        )}
      </div>

      {/* Developer Filter Bar */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          onClick={() => setDevFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            devFilter === 'all'
              ? 'bg-white text-black'
              : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/70'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setDevFilter('unassigned')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            devFilter === 'unassigned'
              ? 'bg-white text-black'
              : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/70'
          }`}
        >
          Unassigned
        </button>
        {activeDevelopers.map((dev) => (
          <button
            key={dev.id}
            onClick={() => setDevFilter(dev.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              devFilter === dev.id
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/70'
            }`}
          >
            {dev.name}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {modules.length === 0 && (
        <div className="text-center py-20">
          <p className="text-white/40 text-sm">No modules yet. Add your first module above.</p>
        </div>
      )}

      {/* Module Sections */}
      <div className="space-y-8">
        {modules.map((mod) => {
          const filtered = filterTasks(mod.tasks ?? []);
          return (
            <div key={mod.id}>
              {/* Module Header */}
              <ModuleHeader
                mod={mod}
                onRename={handleRenameModule}
                onDelete={handleDeleteModule}
              />

              {/* Task List */}
              <div className="space-y-2">
                {filtered.map((task) => (
                  <div key={task.id}>
                    <TaskRow
                      task={task}
                      developers={developers}
                      isExpanded={expandedTasks.has(task.id)}
                      onStatusChange={handleStatusChange}
                      onDeveloperChange={handleDeveloperChange}
                      onQAClick={setQaModalTask}
                      onRename={handleRenameTask}
                      onDelete={handleDeleteTask}
                      onToggleExpand={toggleExpand}
                    />
                    {expandedTasks.has(task.id) && (
                      <TaskExpandedPanel
                        task={task}
                        repoUrl={repoUrl}
                        auditMap={auditMap}
                        onUpdateCriteria={handleUpdateCriteria}
                        onUpdatePRs={handleUpdatePRs}
                      />
                    )}
                  </div>
                ))}
                {filtered.length === 0 && (mod.tasks?.length ?? 0) > 0 && (
                  <p className="text-white/20 text-xs py-2 px-4">No tasks match filter.</p>
                )}
              </div>

              {/* Add Task */}
              {addingTaskForModule === mod.id ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Task title..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask(mod.id)}
                    className="flex-1 px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                  />
                  <button
                    onClick={() => handleAddTask(mod.id)}
                    disabled={savingTask}
                    className="px-3 py-1.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    {savingTask ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setAddingTaskForModule(null); setNewTaskTitle(''); }}
                    className="px-3 py-1.5 text-sm text-white/40 hover:text-white/60 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTaskForModule(mod.id)}
                  className="mt-3 w-full px-3 py-2 text-sm text-white/40 border border-white/10 rounded-lg hover:text-white/60 hover:border-white/20 transition-colors"
                >
                  + Add Task
                </button>
              )}
            </div>
          );
        })}
      </div>

      {qaModalTask && (
        <QAModal
          taskId={qaModalTask.id}
          taskTitle={qaModalTask.title}
          initialChecks={qaModalTask.qa_checks ?? {}}
          onSave={handleQASave}
          onClose={() => setQaModalTask(null)}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────── ModuleHeader */

function ModuleHeader({
  mod,
  onRename,
  onDelete,
}: {
  mod: Module;
  onRename: (moduleId: string, newName: string) => void;
  onDelete: (moduleId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(mod.name);

  return (
    <div className="group flex items-center gap-2 mb-3">
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              onRename(mod.id, draft.trim());
              setEditing(false);
            }
            if (e.key === 'Escape') {
              setDraft(mod.name);
              setEditing(false);
            }
          }}
          onBlur={() => { setDraft(mod.name); setEditing(false); }}
          className="px-2 py-0.5 text-base font-semibold bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:border-white/40"
        />
      ) : (
        <h3
          onClick={() => setEditing(true)}
          className="text-white font-semibold cursor-pointer hover:text-white/70 transition-colors"
        >
          {mod.name}
        </h3>
      )}
      <span className="text-white/30 text-sm">
        ({mod.tasks?.length ?? 0} tasks)
      </span>
      <button
        onClick={() => onDelete(mod.id)}
        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
