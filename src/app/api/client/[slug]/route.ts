import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TaskRow {
  id: string;
  title: string;
  status: string;
  qa_checks: Record<string, boolean> | null;
}

interface ModuleRow {
  id: string;
  name: string;
  position: number;
  tasks: TaskRow[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const sessionCookie = req.cookies.get('client_session');

  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = sessionCookie.value;

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('name, client_name, status, start_date, target_end_date, budget_hours, used_hours, next_milestone, next_milestone_date')
    .eq('id', projectId)
    .eq('client_slug', slug)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch events (last 10)
  const { data: events } = await supabase
    .from('events_cache')
    .select('id, provider, event_type, severity, title, metadata, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch modules with tasks
  const { data: modules } = await supabase
    .from('modules')
    .select('id, name, position, tasks(id, title, status, qa_checks)')
    .eq('project_id', projectId)
    .order('position', { ascending: true })
    .order('position', { ascending: true, foreignTable: 'tasks' });

  // Calculate metrics
  const allEvents = events ?? [];
  const allModules = (modules ?? []) as ModuleRow[];

  // Error count
  const error_count = allEvents.filter((e) => e.severity === 'error').length;

  // Uptime percent
  const uptimeEvents = allEvents.filter((e) => e.event_type === 'uptime');
  const uptime_percent =
    uptimeEvents.length > 0
      ? Math.round(
          (uptimeEvents.filter((e) => e.severity === 'success').length /
            uptimeEvents.length) *
            1000
        ) / 10
      : null;

  // Deploy count
  const deploy_count = allEvents.filter((e) => e.event_type === 'deployment').length;

  // QA pass rate
  const tasksWithChecks = allModules
    .flatMap((m) => m.tasks)
    .filter((t) => t.qa_checks && Object.keys(t.qa_checks).length > 0);
  const fullyPassed = tasksWithChecks.filter((t) =>
    Object.values(t.qa_checks!).every(Boolean)
  );
  const qa_pass_rate =
    tasksWithChecks.length > 0
      ? Math.round((fullyPassed.length / tasksWithChecks.length) * 100)
      : null;

  // Fetch open blockers
  const { data: blockers } = await supabase
    .from('blockers')
    .select('id, title, waiting_on, status')
    .eq('project_id', projectId)
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  // Fetch change requests
  const { data: changeRequests } = await supabase
    .from('change_requests')
    .select('id, title, description, status, hours_impact')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    project,
    events: allEvents,
    modules: allModules,
    metrics: { error_count, uptime_percent, qa_pass_rate, deploy_count },
    blockers: blockers ?? [],
    changeRequests: changeRequests ?? [],
  });
}
