import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEVELOPER_FIELDS =
  'id, name, email, github_username, slug, stacks, status, created_at';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('developers')
      .select(DEVELOPER_FIELDS)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('GET /api/developers error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, github_username, slug, stacks, password } = body;

    if (!name || !email || !github_username || !slug || !password) {
      return NextResponse.json(
        { error: 'name, email, github_username, slug, and password are required' },
        { status: 400 }
      );
    }

    const password_hash = await bcrypt.hash(password.trim(), 10);

    const { data, error } = await supabase
      .from('developers')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        github_username: github_username.trim(),
        slug: slug.trim().toLowerCase(),
        stacks: stacks ?? [],
        password_hash,
      })
      .select(DEVELOPER_FIELDS)
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A developer with that email, github_username, or slug already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('POST /api/developers error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
