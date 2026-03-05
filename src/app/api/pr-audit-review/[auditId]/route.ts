import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  const { auditId } = await params;
  const { review_action, review_note } = await request.json();

  if (review_action !== "approved" && review_action !== "changes_requested") {
    return NextResponse.json(
      { error: "review_action must be 'approved' or 'changes_requested'" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("pr_audits")
    .update({
      review_action,
      review_note,
      reviewed_at: new Date().toISOString(),
      reviewed_by: "admin",
    })
    .eq("id", auditId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
