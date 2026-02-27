import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { slug, password } = await req.json();

    if (!slug || !password) {
      return NextResponse.json(
        { error: 'slug and password are required' },
        { status: 400 }
      );
    }

    const { data: project, error } = await supabase
      .from('projects')
      .select('id, client_password')
      .eq('client_slug', slug)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    if (project.client_password !== password) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const response = NextResponse.json(
      { success: true, projectId: project.id },
      { status: 200 }
    );

    response.cookies.set('client_session', project.id, {
      httpOnly: true,
      path: '/client',
      maxAge: 86400,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
