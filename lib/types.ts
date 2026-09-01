export type Candidate = {
  id: string;
  name: string;
  ballot_number: number;
  tagline: string;
  accent: string;
  photo_url: string | null;
};

export type VoteRecord = {
  id: string;
  voter_name: string;
  created_at: string;
  photo_url: string | null;
  candidate: { name: string; ballot_number: number } | null;
};

export type ResultsPayload = {
  electionOpen: boolean;
  resultsPublished: boolean;
  publishedAt: string | null;
  totalVotes: number;
  candidates: Array<Candidate & { votes: number }>;
  votes: VoteRecord[];
};
