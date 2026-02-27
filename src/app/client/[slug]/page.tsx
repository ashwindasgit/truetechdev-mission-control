import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ClientLoginForm from './ClientLoginForm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ClientLoginPage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const session = cookieStore.get('client_session');

  if (session?.value) {
    redirect(`/client/${slug}/dashboard`);
  }

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('client_slug', slug)
    .single();

  const projectName = project?.name ?? 'Project';

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <ClientLoginForm slug={slug} projectName={projectName} />
    </div>
  );
}
