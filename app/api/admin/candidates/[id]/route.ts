import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const candidateSchema = z.object({
  name: z.string().trim().min(2, "Enter the candidate's full name.").max(100),
  tagline: z.string().trim().max(180),
});

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function PUT(request: NextRequest, context: RouteContext<"/api/admin/candidates/[id]">) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid candidate." }, { status: 400 });
  }

  const form = await request.formData();
  const parsed = candidateSchema.safeParse({ name: form.get("name"), tagline: form.get("tagline") });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid candidate details." }, { status: 400 });
  }

  const photo = form.get("photo");
  if (photo !== null && !(photo instanceof File)) {
    return NextResponse.json({ error: "Invalid candidate photo." }, { status: 400 });
  }
  if (photo instanceof File && (!extensions[photo.type] || photo.size > 5 * 1024 * 1024)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image under 5 MB." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const [{ data: settings }, { data: candidate }] = await Promise.all([
    db.from("election_settings").select("is_open,results_published").eq("id", 1).single(),
    db.from("candidates").select("id,name,tagline,photo_path").eq("id", id).eq("active", true).maybeSingle(),
  ]);
  if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  if (settings?.results_published) return NextResponse.json({ error: "Candidate profiles are locked after results are published." }, { status: 409 });
  if (settings?.is_open) return NextResponse.json({ error: "Pause voting before editing candidate profiles." }, { status: 409 });

  let newPhotoPath: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    newPhotoPath = `profiles/${id}/${randomUUID()}.${extensions[photo.type]}`;
    const { error: uploadError } = await db.storage
      .from("candidate-photos")
      .upload(newPhotoPath, await photo.arrayBuffer(), { contentType: photo.type, upsert: false });
    if (uploadError) return NextResponse.json({ error: "Could not upload the candidate photo." }, { status: 500 });
  }

  const { error: updateError } = await db
    .from("candidates")
    .update({
      name: parsed.data.name,
      tagline: parsed.data.tagline,
      ...(newPhotoPath ? { photo_path: newPhotoPath } : {}),
    })
    .eq("id", id);
  if (updateError) {
    if (newPhotoPath) await db.storage.from("candidate-photos").remove([newPhotoPath]);
    return NextResponse.json({ error: "Could not update the candidate." }, { status: 500 });
  }

  if (newPhotoPath && candidate.photo_path) {
    await db.storage.from("candidate-photos").remove([candidate.photo_path]);
  }
  await db.from("audit_logs").insert({
    admin_user_id: admin.id,
    action: "CANDIDATE_PROFILE_UPDATED",
    details: {
      candidate_id: id,
      previous_name: candidate.name,
      new_name: parsed.data.name,
      photo_replaced: Boolean(newPhotoPath),
    },
  });
  return NextResponse.json({ ok: true });
}
