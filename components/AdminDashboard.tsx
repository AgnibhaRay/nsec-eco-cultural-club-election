"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Eye, Leaf, LogOut, Pause, Play, RefreshCw, Settings2, ShieldCheck, Users, Vote } from "lucide-react";
import type { ResultsPayload } from "@/lib/types";
import CandidateEditor from "@/components/CandidateEditor";

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/results", { cache: "no-store" });
      if (response.status === 401) { router.push("/admin/login"); return; }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load results.");
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load results.");
    }
  }, [router]);

  // Initial client-side fetch also handles expired admin sessions.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function setElectionOpen(isOpen: boolean) {
    if (!window.confirm(isOpen ? "Resume public voting?" : "Pause public voting immediately?")) return;
    setBusy(true);
    const response = await fetch("/api/admin/election", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen }),
    });
    if (!response.ok) setError("Could not update the election state.");
    await load();
    setBusy(false);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  async function declareResult() {
    const confirmed = window.confirm(
      "Declare the final result now? This will close voting, publish totals on the public page, and lock candidate profiles. This cannot be undone from the app.",
    );
    if (!confirmed) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/result", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not declare the final result.");
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not declare the final result.");
    } finally {
      setBusy(false);
    }
  }

  const leadingVotes = Math.max(1, ...(data?.candidates.map((candidate) => candidate.votes) ?? [1]));

  return (
    <main className="admin-shell evm-admin-shell">
      <header className="admin-header evm-admin-header">
        <div className="evm-admin-brand">
          <span className="evm-club-mark"><Leaf size={21} /></span>
          <span>
            <strong>Eco Cultural Club</strong>
            <small>Netaji Subhas Engineering College</small>
          </span>
        </div>
        <div className="evm-admin-header-label"><span>Authorised personnel only</span><strong>Election Control Unit</strong></div>
        <div className="admin-actions">
          <button className="icon-btn" onClick={() => void load()} title="Refresh election data" aria-label="Refresh election data"><RefreshCw size={16} /></button>
          <button className="secondary-btn" onClick={logout}><LogOut size={15} /> Sign out</button>
        </div>
      </header>

      <section className="admin-content">
        <div className="admin-title-row evm-admin-title-row">
          <div>
            <div className="evm-kicker"><span /> Live administration</div>
            <h1>Control <em>room.</em></h1>
            <p className="evm-admin-intro">Monitor turnout, configure the ballot unit, and publish the certified final result.</p>
          </div>
          {data && (
            <div className="evm-master-control">
              <span className="evm-screw screw-top-left" aria-hidden="true" />
              <span className="evm-screw screw-top-right" aria-hidden="true" />
              <div className="master-control-status">
                <span className={`control-lamp ${data.resultsPublished ? "final" : data.electionOpen ? "on" : "paused"}`} />
                <span><small>Public ballot</small><strong>{data.resultsPublished ? "Result final" : data.electionOpen ? "Voting open" : "Voting paused"}</strong></span>
              </div>
              <div className="election-action-group">
                {!data.resultsPublished && <button className={`state-button ${data.electionOpen ? "pause" : "resume"}`} disabled={busy} onClick={() => setElectionOpen(!data.electionOpen)}>
                  {data.electionOpen ? <><Pause size={16} /> Pause voting</> : <><Play size={16} /> Resume voting</>}
                </button>}
                {!data.resultsPublished ? (
                  <button className="state-button declare" disabled={busy} onClick={declareResult}><Award size={16} /> Declare final result</button>
                ) : (
                  <span className="published-badge"><Award size={16} /> Result published</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="integrity-banner evm-integrity-banner">
          <ShieldCheck size={21} />
          <div><strong>Integrity controls active</strong><span>Control actions are recorded in the audit log. Submitted ballots cannot be edited from this console.</span></div>
          <span className="integrity-seal">SECURE</span>
        </div>
        {error && <div className="error-box admin-error">{error}</div>}

        {!data ? <div className="loading-panel">Loading secure election data…</div> : (
          <>
            <div className="stats-grid evm-stats-grid">
              <div className="stat-card total-card"><span className="stat-icon"><Users size={19} /></span><span>Total turnout</span><strong>{String(data.totalVotes).padStart(3, "0")}</strong></div>
              {data.candidates.map((candidate) => (
                <div className="stat-card" key={candidate.id}>
                  <span className="ballot-chip" style={{ background: candidate.accent }}>#{candidate.ballot_number}</span>
                  <span>{candidate.name}</span><strong>{candidate.votes}</strong>
                  <div className="result-track"><span style={{ width: `${(candidate.votes / leadingVotes) * 100}%`, background: candidate.accent }} /></div>
                </div>
              ))}
            </div>

            <CandidateEditor
              candidates={data.candidates}
              locked={data.electionOpen || data.resultsPublished}
              lockReason={data.resultsPublished ? "Locked after result publication" : "Pause voting to edit"}
              onSaved={load}
            />

            <section className="records-panel evm-register-panel">
              <div className="panel-title">
                <div className="panel-heading-group"><span className="panel-icon"><Vote size={18} /></span><div><span className="card-kicker">Private verification register</span><h2>Ballot audit register</h2></div></div>
                <span className="status-pill"><span className={`status-dot ${data.electionOpen ? "" : "closed"}`} />{data.resultsPublished ? "Result final" : data.electionOpen ? "Voting open" : "Voting paused"}</span>
              </div>
              <div className="register-warning"><Eye size={14} /><span>Restricted view: voter choice and verification photographs are visible only to authorised administrators.</span></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Voter</th><th>Choice</th><th>Submitted</th><th>Verification</th></tr></thead>
                  <tbody>
                    {data.votes.map((vote) => (
                      <tr key={vote.id}>
                        <td><strong>{vote.voter_name}</strong><small>{vote.id.slice(0, 8).toUpperCase()}</small></td>
                        <td><span className="choice-pill">#{vote.candidate?.ballot_number} {vote.candidate?.name ?? "Removed candidate"}</span></td>
                        <td>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(vote.created_at))}</td>
                        <td>{vote.photo_url ? <a className="photo-link" href={vote.photo_url} target="_blank" rel="noreferrer"><Eye size={14} /> View selfie</a> : "Unavailable"}</td>
                      </tr>
                    ))}
                    {data.votes.length === 0 && <tr><td colSpan={4} className="empty-cell">No ballots have been lodged yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
            <div className="evm-admin-footer"><Settings2 size={13} /><span>Election Control Unit · Eco Cultural Club, NSEC</span><strong>ADMIN CONSOLE</strong></div>
          </>
        )}
      </section>
    </main>
  );
}
