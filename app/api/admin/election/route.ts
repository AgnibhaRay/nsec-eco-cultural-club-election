import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = z.object({ isOpen: z.boolean() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid election state." }, { status: 400 });

  const db = supabaseAdmin();
  if (parsed.data.isOpen) {
    const { data: settings } = await db
      .from("election_settings")
      .select("results_published")
      .eq("id", 1)
      .single();
    if (settings?.results_published) {
      return NextResponse.json({ error: "Published results are final; voting cannot be reopened." }, { status: 409 });
    }
  }
  const { error } = await db
    .from("election_settings")
    .update({ is_open: parsed.data.isOpen, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return NextResponse.json({ error: "Could not update election state." }, { status: 500 });

  await db.from("audit_logs").insert({
    admin_user_id: admin.id,
    action: parsed.data.isOpen ? "ELECTION_RESUMED" : "ELECTION_PAUSED",
    details: { source: "admin_dashboard" },
  });
  return NextResponse.json({ ok: true, isOpen: parsed.data.isOpen });
}
