import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const [{ data: candidates, error: candidateError }, { data: votes, error: voteError }, { data: settings }] = await Promise.all([
    db.from("candidates").select("id,name,ballot_number,tagline,accent,photo_path").eq("active", true).order("ballot_number"),
    db.from("votes").select("id,voter_name,photo_path,candidate_id,created_at").order("created_at", { ascending: false }),
    db.from("election_settings").select("is_open,results_published,results_published_at").eq("id", 1).single(),
  ]);
  if (candidateError || voteError) return NextResponse.json({ error: "Could not load election data." }, { status: 500 });

  const counts = new Map<string, number>();
  for (const vote of votes ?? []) counts.set(vote.candidate_id, (counts.get(vote.candidate_id) ?? 0) + 1);
  const candidateMap = new Map((candidates ?? []).map((candidate) => [candidate.id, candidate]));

  const linkedVotes = await Promise.all((votes ?? []).map(async (vote) => {
    const { data: signed } = await db.storage.from("voter-selfies").createSignedUrl(vote.photo_path, 300);
    const candidate = candidateMap.get(vote.candidate_id);
    return {
      id: vote.id,
      voter_name: vote.voter_name,
      created_at: vote.created_at,
      photo_url: signed?.signedUrl ?? null,
      candidate: candidate ? { name: candidate.name, ballot_number: candidate.ballot_number } : null,
    };
  }));

  return NextResponse.json({
    electionOpen: settings?.is_open ?? false,
    totalVotes: votes?.length ?? 0,
    resultsPublished: settings?.results_published ?? false,
    publishedAt: settings?.results_published_at ?? null,
    candidates: (candidates ?? []).map(({ photo_path, ...candidate }) => ({
      ...candidate,
      photo_url: photo_path
        ? db.storage.from("candidate-photos").getPublicUrl(photo_path).data.publicUrl
        : null,
      votes: counts.get(candidate.id) ?? 0,
    })),
    votes: linkedVotes,
  });
}
