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

  // Fetch project with cache fields
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('name, client_name, status, ai_summary, ai_summary_generated_at')
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

  const allEvents = (events ?? []) as EventRow[];
  const allModules = (modules ?? []) as ModuleRow[];

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

  const userPrompt = `Project: ${project.name}
Client: ${project.client_name ?? 'N/A'}
Status: ${project.status}
Recent events (last 20):
${eventsText}
Modules and tasks:
${modulesText}
Write a 2-3 sentence summary of project health.`;

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
        max_tokens: 200,
        system: 'You are a project health assistant for a software development agency. Write a 2-3 sentence plain English summary of a client project\'s current health. Be specific, use the actual data. Sound professional but human. No bullet points.',
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
