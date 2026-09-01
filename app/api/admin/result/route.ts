import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: current, error: readError } = await db
    .from("election_settings")
    .select("results_published")
    .eq("id", 1)
    .single();
  if (readError) return NextResponse.json({ error: "Could not read election state." }, { status: 500 });
  if (current.results_published) {
    return NextResponse.json({ error: "The final result has already been declared." }, { status: 409 });
  }

  const publishedAt = new Date().toISOString();
  const { error } = await db
    .from("election_settings")
    .update({
      is_open: false,
      results_published: true,
      results_published_at: publishedAt,
      updated_at: publishedAt,
    })
    .eq("id", 1)
    .eq("results_published", false);
  if (error) return NextResponse.json({ error: "Could not declare the final result." }, { status: 500 });

  await db.from("audit_logs").insert({
    admin_user_id: admin.id,
    action: "FINAL_RESULT_DECLARED",
    details: { source: "admin_dashboard", published_at: publishedAt },
  });
  return NextResponse.json({ ok: true, publishedAt });
}
