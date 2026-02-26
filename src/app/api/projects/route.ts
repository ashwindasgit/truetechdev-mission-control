import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Use service role here — this is a server-only API route
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, client_name, client_slug, client_password } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    if (!client_slug || !client_slug.trim()) {
      return NextResponse.json(
        { error: 'Client slug is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        client_name: client_name?.trim() || null,
        client_slug: client_slug.trim().toLowerCase(),
        client_password: client_password?.trim() || null,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) {
      // Unique constraint on client_slug
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'That client slug is already taken. Choose a different one.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });

  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
