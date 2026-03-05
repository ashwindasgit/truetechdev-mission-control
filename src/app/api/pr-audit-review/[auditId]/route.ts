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

  // Auto-merge PR on GitHub when approved
  if (review_action === "approved" && data.repo_url && data.pr_number) {
    const match = data.repo_url.match(
      /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/
    );
    if (match) {
      const [, owner, repo] = match;
      let mergeError: string | undefined;
      try {
        const mergeRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${data.pr_number}/merge`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
              Accept: "application/vnd.github+json",
            },
            body: JSON.stringify({
              merge_method: "squash",
              commit_title:
                "Approved and merged via Mission Control",
            }),
          }
        );
        if (mergeRes.ok) {
          await supabase
            .from("pr_audits")
            .update({ merged_at: new Date().toISOString() })
            .eq("id", auditId);
          return NextResponse.json({
            ...data,
            merged_at: new Date().toISOString(),
          });
        }
        const mergeBody = await mergeRes.json();
        mergeError = mergeBody.message ?? `GitHub merge failed (${mergeRes.status})`;
        console.error("GitHub merge failed:", mergeError);
      } catch (err) {
        mergeError = err instanceof Error ? err.message : "GitHub merge request failed";
        console.error("GitHub merge error:", mergeError);
      }
      return NextResponse.json({ ...data, merge_error: mergeError });
    }
  }

  return NextResponse.json(data);
}
