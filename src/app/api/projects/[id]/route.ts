import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', id)
      .select('id, name, status, client_name, client_slug, created_at, start_date, target_end_date, budget_hours, used_hours, next_milestone, next_milestone_date, branch_protection')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data });
  } catch (err) {
    console.error('PATCH /api/projects/[id] error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
