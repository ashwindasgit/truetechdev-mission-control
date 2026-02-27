import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface EventRow {
  provider: string;
  event_type: string;
  severity: string;
  title: string;
}

interface TaskRow {
  status: string;
}

interface ModuleRow {
  name: string;
  tasks: TaskRow[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;

  // Fetch project with cache fields + timeline/budget
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('name, client_name, status, ai_summary, ai_summary_generated_at, start_date, target_end_date, budget_hours, used_hours, next_milestone, next_milestone_date')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Check cache: if summary exists and is less than 30 minutes old
  if (project.ai_summary && project.ai_summary_generated_at) {
    const generatedAt = new Date(project.ai_summary_generated_at).getTime();
    const thirtyMinutes = 30 * 60 * 1000;
    if (Date.now() - generatedAt < thirtyMinutes) {
      return NextResponse.json({ summary: project.ai_summary, cached: true });
    }
  }

  // Fetch events and modules for prompt
  const { data: events } = await supabase
    .from('events_cache')
    .select('provider, event_type, severity, title')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: modules } = await supabase
    .from('modules')
    .select('name, tasks(status)')
    .eq('project_id', projectId)
    .order('position', { ascending: true });

  // Fetch blockers and change requests
  const { data: openBlockers } = await supabase
    .from('blockers')
    .select('title')
    .eq('project_id', projectId)
    .eq('status', 'open');

  const { data: approvedChanges } = await supabase
    .from('change_requests')
    .select('hours_impact')
    .eq('project_id', projectId)
    .eq('status', 'approved');

  const allEvents = (events ?? []) as EventRow[];
  const allModules = (modules ?? []) as ModuleRow[];
  const blockerList = openBlockers ?? [];
  const changeList = approvedChanges ?? [];

  // Build prompt
  const eventsText = allEvents.length > 0
    ? allEvents.map((e) => `${e.provider} - ${e.event_type} - ${e.severity} - ${e.title}`).join('\n')
    : 'No recent events.';

  const modulesText = allModules.length > 0
    ? allModules.map((m) => {
        const total = m.tasks.length;
        const byStatus: Record<string, number> = {};
        m.tasks.forEach((t) => {
          byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
        });
        const statusStr = Object.entries(byStatus).map(([s, c]) => `${c} ${s}`).join(', ');
        return `${m.name}: ${total} tasks (${statusStr || 'no tasks'})`;
      }).join('\n')
    : 'No modules or tasks yet.';

  // Timeline context
  let timelineText = 'Timeline: Not set.';
  if (project.start_date && project.target_end_date) {
    const daysLeft = Math.max(0, Math.ceil((new Date(project.target_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    timelineText = `Timeline: ${project.start_date} to ${project.target_end_date}, ${daysLeft} days remaining`;
  }

  // Budget context
  let budgetText = 'Budget: Not set.';
  if (project.budget_hours != null && project.used_hours != null) {
    const pct = project.budget_hours > 0 ? Math.round((project.used_hours / project.budget_hours) * 100) : 0;
    budgetText = `Budget: ${project.used_hours}/${project.budget_hours} hours used (${pct}%)`;
  }

  // Milestone context
  const milestoneText = project.next_milestone
    ? `Next milestone: ${project.next_milestone}${project.next_milestone_date ? ` due ${project.next_milestone_date}` : ''}`
    : 'Next milestone: Not set.';

  // Blockers context
  const blockersText = blockerList.length > 0
    ? `Open blockers: ${blockerList.length} open — ${blockerList.map((b) => b.title).join('; ')}`
    : 'Open blockers: None.';

  // Scope changes context
  const approvedCount = changeList.length;
  const approvedHours = changeList.reduce((sum, c) => sum + (c.hours_impact ?? 0), 0);
  const scopeText = approvedCount > 0
    ? `Approved scope changes: ${approvedCount} changes, +${approvedHours} hours added`
    : 'Approved scope changes: None.';

  const userPrompt = `Project: ${project.name}
Client: ${project.client_name ?? 'N/A'}
Status: ${project.status}
${timelineText}
${budgetText}
${milestoneText}
${blockersText}
${scopeText}
Recent events (last 20):
${eventsText}
Modules and tasks:
${modulesText}

Write the summary using exactly these 6 labeled sections. Keep each section to 1-2 sentences. No intro, no conclusion, just the 6 sections.

📋 Summary: One sentence on overall project health and whether it's on track.
📅 Timeline: Mention the deadline and days remaining.
💰 Budget: State hours used, total hours, and percentage.
🔨 In Progress: What the team is actively working on right now.
⚠️ Issues: Any errors or technical problems (or "No critical issues." if none).
🔒 Waiting On You: Any open blockers waiting on the client (or "Nothing required from you right now." if none).`;

  // Call Claude API
  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: 'You are a project health assistant for a software development agency. Write a structured project summary using exactly these labeled sections. Each section is 1-2 sentences maximum. No markdown headers, no bullet points, no walls of text. Use plain text only. Sound professional but human.',
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!claudeRes.ok) {
      const errBody = await claudeRes.text();
      console.error('Claude API error:', errBody);
      return NextResponse.json({ summary: null, cached: false, error: 'AI generation failed' });
    }

    const claudeData = await claudeRes.json();
    const summary: string = claudeData.content?.[0]?.text ?? '';

    // Save to database
    await supabase
      .from('projects')
      .update({ ai_summary: summary, ai_summary_generated_at: new Date().toISOString() })
      .eq('id', projectId);

    return NextResponse.json({ summary, cached: false });
  } catch (err) {
    console.error('Claude API call failed:', err);
    // Return stale cache if available
    if (project.ai_summary) {
      return NextResponse.json({ summary: project.ai_summary, cached: true });
    }
    return NextResponse.json({ summary: null, cached: false });
  }
}
