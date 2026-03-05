import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const PR_AUDIT_FIELDS =
  'id, project_id, pr_number, repo_url, audit_summary, confidence_score, passed, issues, raw_pr_title, raw_pr_author, created_at';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('pr_audits')
    .select(PR_AUDIT_FIELDS)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
