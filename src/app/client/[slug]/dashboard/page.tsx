import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import ClientDashboard from './ClientDashboard';

interface Props {
  params: Promise<{ slug: string }>;
}

interface EventMetadata {
  url?: string;
  issue_url?: string;
  repo_url?: string;
  [key: string]: unknown;
}

interface Event {
  id: string;
  provider: string;
  event_type: string;
  severity: string;
  title: string;
  metadata: EventMetadata;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  qa_checks: Record<string, boolean> | null;
}

interface Module {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
}

interface Metrics {
  error_count: number;
  uptime_percent: number | null;
  qa_pass_rate: number | null;
  deploy_count: number;
}

interface Project {
  name: string;
  client_name: string | null;
  status: string;
  start_date: string | null;
  target_end_date: string | null;
  budget_hours: number | null;
  used_hours: number | null;
  next_milestone: string | null;
  next_milestone_date: string | null;
}

interface Blocker {
  id: string;
  title: string;
  waiting_on: string;
  status: string;
}

interface ChangeRequest {
  id: string;
  title: string;
  description: string | null;
  status: string;
  hours_impact: number;
}

interface DashboardData {
  project: Project;
  events: Event[];
  modules: Module[];
  metrics: Metrics;
  blockers: Blocker[];
  changeRequests: ChangeRequest[];
}

export default async function ClientDashboardPage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const session = cookieStore.get('client_session');

  if (!session?.value) {
    redirect(`/client/${slug}`);
  }

  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';

  const res = await fetch(`${protocol}://${host}/api/client/${slug}`, {
    headers: { Cookie: `client_session=${session.value}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    redirect(`/client/${slug}`);
  }

  const data: DashboardData = await res.json();

  // Fetch AI summary
  let summary: string | null = null;
  try {
    const summaryRes = await fetch(
      `${protocol}://${host}/api/summary/${session.value}`,
      { cache: 'no-store' }
    );
    if (summaryRes.ok) {
      const summaryData = await summaryRes.json();
      summary = summaryData.summary ?? null;
    }
  } catch {
    // Summary is optional — continue without it
  }

  return <ClientDashboard slug={slug} data={data} summary={summary} />;
}
