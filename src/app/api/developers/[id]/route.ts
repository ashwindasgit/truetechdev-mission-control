import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_FIELDS = ['name', 'email', 'github_username', 'slug', 'stacks', 'status'];
const VALID_STATUSES = ['active', 'paused', 'offboarded'];

const DEVELOPER_FIELDS =
  'id, name, email, github_username, slug, stacks, status, created_at';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();

    const updates: Record<string, unknown> = {};

    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    if (updates.status && !VALID_STATUSES.includes(updates.status as string)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    if (updates.email) {
      updates.email = (updates.email as string).trim().toLowerCase();
    }

    if (updates.slug) {
      updates.slug = (updates.slug as string).trim().toLowerCase();
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('developers')
      .update(updates)
      .eq('id', id)
      .select(DEVELOPER_FIELDS)
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A developer with that email, github_username, or slug already exists' },
          { status: 409 }
        );
      }
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Developer not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('PATCH /api/developers/[id] error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
