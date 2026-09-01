import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const voteSchema = z.object({
  name: z.string().trim().min(2, "Enter your full registered name.").max(100),
  candidateId: z.string().uuid("Choose a valid candidate."),
});

function normalizedName(name: string) {
  return name.toLocaleLowerCase("en-IN").replace(/\s+/g, " ").trim();
}

export async function POST(request: Request) {
  let uploadedPath: string | null = null;
  try {
    const form = await request.formData();
    const parsed = voteSchema.safeParse({ name: form.get("name"), candidateId: form.get("candidateId") });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid ballot." }, { status: 400 });
    }

    const photo = form.get("photo");
    if (!(photo instanceof File)) {
      return NextResponse.json({ error: "A verification photo is required." }, { status: 400 });
    }
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(photo.type) || photo.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "The photo must be a JPEG, PNG, or WebP under 5 MB." }, { status: 400 });
    }

    const db = supabaseAdmin();
    const [{ data: settings }, { data: candidate }, { data: existing }] = await Promise.all([
      db.from("election_settings").select("is_open").eq("id", 1).single(),
      db.from("candidates").select("id").eq("id", parsed.data.candidateId).eq("active", true).maybeSingle(),
      db.from("votes").select("id").eq("voter_name_key", normalizedName(parsed.data.name)).maybeSingle(),
    ]);

    if (!settings?.is_open) return NextResponse.json({ error: "Voting is currently paused." }, { status: 403 });
    if (!candidate) return NextResponse.json({ error: "That candidate is not on the active ballot." }, { status: 400 });
    if (existing) return NextResponse.json({ error: "A vote has already been lodged under this name." }, { status: 409 });

    uploadedPath = `verification/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.jpg`;
    const bytes = await photo.arrayBuffer();
    const { error: uploadError } = await db.storage.from("voter-selfies").upload(uploadedPath, bytes, {
      contentType: photo.type,
      cacheControl: "0",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { error: insertError } = await db.from("votes").insert({
      voter_name: parsed.data.name,
      voter_name_key: normalizedName(parsed.data.name),
      candidate_id: parsed.data.candidateId,
      photo_path: uploadedPath,
    });
    if (insertError) {
      await db.storage.from("voter-selfies").remove([uploadedPath]);
      uploadedPath = null;
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "A vote has already been lodged under this name." }, { status: 409 });
      }
      throw insertError;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Vote submission failed", error);
    if (uploadedPath) {
      try { await supabaseAdmin().storage.from("voter-selfies").remove([uploadedPath]); } catch { /* best effort */ }
    }
    return NextResponse.json({ error: "Your vote could not be recorded. Please ask an election admin for help." }, { status: 500 });
  }
}
