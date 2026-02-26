import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { moduleId, projectId, title } = body;

    if (!moduleId || !projectId || !title?.trim()) {
      return NextResponse.json(
        { error: 'moduleId, projectId, and title are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        module_id: moduleId,
        project_id: projectId,
        title: title.trim(),
        status: 'backlog',
        position: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
