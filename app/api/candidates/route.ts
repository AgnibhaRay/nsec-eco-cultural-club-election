import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = supabaseAdmin();
    const [{ data: candidates, error }, { data: settings }, { data: votes, error: voteError }] = await Promise.all([
      db
        .from("candidates")
        .select("id,name,ballot_number,tagline,accent,photo_path")
        .eq("active", true)
        .order("ballot_number"),
      db.from("election_settings").select("is_open,results_published,results_published_at").eq("id", 1).single(),
      db.from("votes").select("candidate_id"),
    ]);

    if (error || voteError) throw error ?? voteError;
    const resultsPublished = settings?.results_published ?? false;
    const counts = new Map<string, number>();
    if (resultsPublished) {
      for (const vote of votes ?? []) counts.set(vote.candidate_id, (counts.get(vote.candidate_id) ?? 0) + 1);
    }
    const publicCandidates = (candidates ?? []).map(({ photo_path, ...candidate }) => ({
      ...candidate,
      photo_url: photo_path
        ? db.storage.from("candidate-photos").getPublicUrl(photo_path).data.publicUrl
        : null,
      ...(resultsPublished ? { votes: counts.get(candidate.id) ?? 0 } : {}),
    }));
    return NextResponse.json({
      candidates: publicCandidates,
      electionOpen: settings?.is_open ?? false,
      resultsPublished,
      publishedAt: settings?.results_published_at ?? null,
      ...(resultsPublished ? { totalVotes: votes?.length ?? 0 } : {}),
    });
  } catch (error) {
    console.error("Candidate fetch failed", error);
    return NextResponse.json({ error: "The ballot is temporarily unavailable." }, { status: 500 });
  }
}
