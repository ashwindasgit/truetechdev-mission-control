import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CATEGORY_SECTIONS: { key: string; icon: string; label: string }[] = [
  { key: 'architecture', icon: '🏗', label: 'Architecture' },
  { key: 'integration', icon: '🔌', label: 'Integration Patterns' },
  { key: 'env_config', icon: '⚙️', label: 'Env Config' },
  { key: 'pattern', icon: '🔁', label: 'Patterns' },
  { key: 'decision', icon: '🧠', label: 'Decisions' },
  { key: 'dependency', icon: '🔗', label: 'Dependencies' },
  { key: 'gotcha', icon: '⚠️', label: 'Gotchas' },
];

interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  file_paths: string[];
  confidence: number;
  created_at: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  // Fetch project (exclude client_password)
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('id, name, status, client_name, client_slug, created_at, start_date, target_end_date, budget_hours, used_hours, next_milestone, next_milestone_date')
    .eq('id', projectId)
    .single();

  if (projErr || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Fetch integrations
  const { data: integrations } = await supabase
    .from('integrations')
    .select('provider, config, is_connected')
    .eq('project_id', projectId)
    .limit(50);

  // Fetch modules
  const { data: modules } = await supabase
    .from('modules')
    .select('id, name, position')
    .eq('project_id', projectId)
    .order('position', { ascending: true })
    .limit(50);

  // Fetch tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, module_id, title, status, position')
    .eq('project_id', projectId)
    .order('position', { ascending: true })
    .limit(200);

  // Fetch knowledge entries
  const { data: knowledge } = await supabase
    .from('knowledge_entries')
    .select('id, category, title, content, file_paths, confidence, created_at')
    .eq('project_id', projectId)
    .order('category', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(500);

  // Build task map by module_id
  const tasksByModule: Record<string, typeof tasks> = {};
  for (const t of tasks ?? []) {
    if (!tasksByModule[t.module_id]) tasksByModule[t.module_id] = [];
    tasksByModule[t.module_id]!.push(t);
  }

  // Group knowledge by category
  const knowledgeByCategory: Record<string, KnowledgeEntry[]> = {};
  for (const entry of (knowledge ?? []) as KnowledgeEntry[]) {
    if (!knowledgeByCategory[entry.category]) knowledgeByCategory[entry.category] = [];
    knowledgeByCategory[entry.category]!.push(entry);
  }

  const today = new Date().toISOString().slice(0, 10);

  // Build markdown
  let md = '';
  md += `# ${project.name} — Continuation Package\n`;
  md += `Generated: ${today} | Mission Control\n\n`;

  md += `## Project Overview\n\n`;
  md += `- **Client:** ${project.client_name ?? 'Not set'}\n`;
  md += `- **Status:** ${project.status}\n`;
  md += `- **Dashboard:** https://mission-control.truetechpro.io/client/${project.client_slug}\n`;
  md += `- **Started:** ${project.start_date ?? 'Not set'}\n`;
  md += `- **Target End Date:** ${project.target_end_date ?? 'Not set'}\n`;
  md += `- **Budget:** ${project.used_hours ?? 0} / ${project.budget_hours ?? 0} hours used\n`;
  md += `- **Next Milestone:** ${project.next_milestone ?? 'None'} (by ${project.next_milestone_date ?? 'TBD'})\n\n`;

  md += `## Integrations\n\n`;
  if ((integrations ?? []).length === 0) {
    md += `No integrations configured.\n\n`;
  } else {
    for (const intg of integrations!) {
      md += `- **${intg.provider}:** ${intg.is_connected ? 'Connected' : 'Not connected'} — ${JSON.stringify(intg.config)}\n`;
    }
    md += '\n';
  }

  md += `## Current Task State\n\n`;
  if ((modules ?? []).length === 0) {
    md += `No modules or tasks.\n\n`;
  } else {
    for (const mod of modules!) {
      md += `### ${mod.name}\n\n`;
      const modTasks = tasksByModule[mod.id] ?? [];
      if (modTasks.length === 0) {
        md += `No tasks.\n\n`;
      } else {
        for (const t of modTasks) {
          md += `- [${t.status}] ${t.title}\n`;
        }
        md += '\n';
      }
    }
  }

  md += `## Knowledge Base\n\n`;
  for (const section of CATEGORY_SECTIONS) {
    md += `### ${section.icon} ${section.label}\n\n`;
    const entries = knowledgeByCategory[section.key];
    if (!entries || entries.length === 0) {
      md += `No entries recorded.\n\n`;
    } else {
      for (const entry of entries) {
        md += `**${entry.title}** (${Math.round(entry.confidence * 100)}% confidence)\n`;
        md += `${entry.content}\n`;
        if (entry.file_paths.length > 0) {
          md += `Files: ${entry.file_paths.join(', ')}\n`;
        }
        md += '\n';
      }
    }
  }

  const slug = project.client_slug ?? 'project';
  const filename = `${slug}-continuation-${today}.md`;

  return NextResponse.json({ markdown: md, filename });
}
