import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

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

    const { data: developer, error } = await supabase
      .from('developers')
      .select('id, name, status, password_hash')
      .eq('slug', slug)
      .single();

    if (error || !developer) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (developer.status !== 'active') {
      return NextResponse.json(
        { error: 'Account inactive' },
        { status: 403 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, developer.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const response = NextResponse.json(
      { success: true, name: developer.name },
      { status: 200 }
    );

    response.cookies.set('dev_session', developer.id, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/dev',
      maxAge: 86400,
    });

    return response;
  } catch (err) {
    console.error('POST /api/dev/auth error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
