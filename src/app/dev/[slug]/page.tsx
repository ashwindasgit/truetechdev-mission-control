import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import DevLoginForm from './DevLoginForm';
import DevDashboard from './DevDashboard';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DevPortalPage({ params }: Props) {
  const { slug } = await params;

  const { data: developer } = await supabase
    .from('developers')
    .select('id, name, email, github_username, slug, stacks, status')
    .eq('slug', slug)
    .single();

  if (!developer) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-white/40 text-sm">Developer not found.</p>
      </div>
    );
  }

  const cookieStore = await cookies();
  const session = cookieStore.get('dev_session');

  if (session?.value === developer.id) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, module_id, modules(name)')
      .eq('developer_id', developer.id)
      .order('created_at', { ascending: false });

    type TaskRow = Record<string, unknown>;

    return (
      <DevDashboard
        developer={developer}
        tasks={
          ((tasks ?? []) as TaskRow[]).map((t) => ({
            id: t.id as string,
            title: t.title as string,
            status: t.status as string,
            module_name:
              ((t.modules as { name: string } | null)?.name) ?? 'Unassigned',
          }))
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <DevLoginForm slug={slug} developerName={developer.name} />
    </div>
  );
}
