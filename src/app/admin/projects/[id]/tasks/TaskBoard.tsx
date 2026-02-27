'use client';

import { useState } from 'react';
import QAModal from '@/components/admin/QAModal';

interface Task {
  id: string;
  title: string;
  status: string;
  pr_url: string | null;
  position: number;
  qa_checks: Record<string, boolean>;
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
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  backlog:  { label: 'Backlog',  classes: 'bg-white/10 text-white/40' },
  in_dev:   { label: 'In Dev',   classes: 'bg-blue-500/20 text-blue-300' },
  in_qa:    { label: 'In QA',    classes: 'bg-yellow-500/20 text-yellow-300' },
  approved: { label: 'Approved', classes: 'bg-purple-500/20 text-purple-300' },
  deployed: { label: 'Deployed', classes: 'bg-emerald-500/20 text-emerald-300' },
  failed:   { label: 'Failed',   classes: 'bg-red-500/20 text-red-300' },
};

function TaskRow({
  task,
  onStatusChange,
  onQAClick,
}: {
  task: Task;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onQAClick: (task: Task) => void;
}) {
  const status = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.backlog;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-lg border border-white/10">
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
      <span className="text-white text-sm flex-1">{task.title}</span>
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
      <button
        onClick={() => onQAClick(task)}
        className="text-xs px-2.5 py-1 rounded-md border border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 transition-colors"
      >
        QA
      </button>
    </div>
  );
}

export default function TaskBoard({ projectId, initialModules }: TaskBoardProps) {
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingTaskForModule, setAddingTaskForModule] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [qaModalTask, setQaModalTask] = useState<Task | null>(null);

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
            ? { ...mod, tasks: [...(mod.tasks ?? []), created] }
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

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
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

      {/* Empty State */}
      {modules.length === 0 && (
        <div className="text-center py-20">
          <p className="text-white/40 text-sm">No modules yet. Add your first module above.</p>
        </div>
      )}

      {/* Module Sections */}
      <div className="space-y-8">
        {modules.map((mod) => (
          <div key={mod.id}>
            {/* Module Header */}
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-white font-semibold">{mod.name}</h3>
              <span className="text-white/30 text-sm">
                ({mod.tasks?.length ?? 0} tasks)
              </span>
            </div>

            {/* Task List */}
            <div className="space-y-2">
              {mod.tasks?.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onQAClick={setQaModalTask}
                />
              ))}
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
        ))}
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
