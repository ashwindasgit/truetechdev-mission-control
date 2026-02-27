import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, name } = body;

    if (!projectId || !name?.trim()) {
      return NextResponse.json(
        { error: 'projectId and name are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('create_module', {
      p_project_id: projectId,
      p_name: name.trim(),
    });

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

export async function PATCH(req: NextRequest) {
  try {
    const { id, name } = await req.json();

    if (!id || !name?.trim()) {
      return NextResponse.json(
        { error: 'id and name are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('modules')
      .update({ name: name.trim() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'id query param is required' },
      { status: 400 }
    );
  }

  // Delete all tasks belonging to this module first
  const { error: tasksError } = await supabase
    .from('tasks')
    .delete()
    .eq('module_id', id);

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 });
  }

  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
