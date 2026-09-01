"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Send } from "lucide-react";
import Image from "next/image";
import type { Candidate } from "@/lib/types";

type CameraState = "idle" | "live" | "captured";
type PublicCandidate = Candidate & { votes?: number };

export default function VotingForm() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<PublicCandidate[]>([]);
  const [electionOpen, setElectionOpen] = useState(true);
  const [resultsPublished, setResultsPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [name, setName] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetch("/api/candidates")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load the ballot.");
        setCandidates(body.candidates);
        setElectionOpen(body.electionOpen);
        setResultsPublished(body.resultsPublished);
        setPublishedAt(body.publishedAt);
        setTotalVotes(body.totalVotes ?? 0);
      })
      .catch((err) => setError(err.message));

    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (cameraState === "live" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => setError("Could not start the camera preview."));
    }
  }, [cameraState]);

  async function startCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraState("live");
    } catch {
      setError("Camera access is required. Allow camera permission and try again.");
    }
  }

  if (resultsPublished) {
    const highest = Math.max(0, ...candidates.map((candidate) => candidate.votes ?? 0));
    const winners = totalVotes > 0 ? candidates.filter((candidate) => (candidate.votes ?? 0) === highest) : [];
    return (
      <section className="vote-card public-results-card">
        <div className="card-kicker">Official final result</div>
        <h2>{winners.length === 1 ? `${winners[0].name} is elected` : winners.length > 1 ? "The result is tied" : "Election concluded"}</h2>
        <p className="result-summary">{totalVotes} verified {totalVotes === 1 ? "vote" : "votes"} counted{publishedAt ? ` · Declared ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(publishedAt))}` : ""}</p>
        <div className="public-result-list">
          {candidates.map((candidate) => {
            const votes = candidate.votes ?? 0;
            const isWinner = winners.some((winner) => winner.id === candidate.id);
            return (
              <div className={`public-result-item ${isWinner ? "winner" : ""}`} key={candidate.id}>
                <span className="result-candidate-photo">
                  {candidate.photo_url ? <Image src={candidate.photo_url} alt="" fill sizes="58px" unoptimized /> : candidate.ballot_number}
                </span>
                <span><strong>{candidate.name}</strong><small>{isWinner ? (winners.length === 1 ? "President-elect" : "Joint highest total") : `Ballot #${candidate.ballot_number}`}</small></span>
                <span className="result-vote-count"><strong>{votes}</strong><small>votes</small></span>
                <span className="public-result-track"><i style={{ width: `${highest ? (votes / highest) * 100 : 0}%`, background: candidate.accent }} /></span>
              </div>
            );
          })}
        </div>
        <p className="result-final-note">Voting is closed. These results were published by an authorised election administrator.</p>
      </section>
    );
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    const maxWidth = 900;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhoto(blob);
        setPhotoPreview(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setCameraState("captured");
      },
      "image/jpeg",
      0.82,
    );
  }

  function retake() {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview("");
    setCameraState("idle");
    void startCamera();
  }

  async function submitVote(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim() || !candidateId || !photo || !consent) {
      setError("Complete your name, candidate choice, selfie, and consent before voting.");
      return;
    }

    setSubmitting(true);
    const form = new FormData();
    form.set("name", name.trim());
    form.set("candidateId", candidateId);
    form.set("photo", photo, "selfie.jpg");

    try {
      const response = await fetch("/api/vote", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Your vote could not be recorded.");
      router.push("/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your vote could not be recorded.");
      setSubmitting(false);
    }
  }

  return (
    <form className="vote-card" onSubmit={submitVote}>
      <div className="card-kicker">Official ballot</div>
      <h2>Cast your vote</h2>

      <label className="field-label" htmlFor="voter-name">Your full name</label>
      <input
        className="text-input"
        id="voter-name"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="As registered with the club"
        autoComplete="name"
        maxLength={100}
        disabled={!electionOpen || submitting}
        required
      />

      <div className="section-space">
        <div className="field-label">Choose one candidate</div>
        <div className="candidate-list">
          {candidates.map((candidate) => (
            <label className="candidate-option" key={candidate.id}>
              <input
                type="radio"
                name="candidate"
                value={candidate.id}
                checked={candidateId === candidate.id}
                onChange={() => setCandidateId(candidate.id)}
                disabled={!electionOpen || submitting}
              />
              <span className="candidate-label">
                <span className="candidate-number candidate-profile-photo" style={{ background: candidate.accent }}>
                  {candidate.photo_url ? <Image src={candidate.photo_url} alt="" fill sizes="41px" unoptimized /> : candidate.ballot_number}
                </span>
                <span>
                  <span className="candidate-name">{candidate.name}</span>
                  <span className="candidate-tag">{candidate.tagline}</span>
                </span>
                <span className="radio-dot" />
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="section-space">
        <div className="field-label">Voter verification photo</div>
        <div className="camera-box">
          {cameraState === "idle" && (
            <div className="camera-idle">
              <span className="camera-icon"><Camera size={18} /></span>
              Your photo is kept private and visible only to authorised election admins.
            </div>
          )}
          {cameraState === "live" && <video ref={videoRef} autoPlay muted playsInline />}
          {/* A temporary local camera Blob URL should not pass through the image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cameraState === "captured" && photoPreview && <img src={photoPreview} alt="Captured voter selfie" />}
          <div className="camera-actions">
            {cameraState === "idle" && <button className="mini-btn" type="button" onClick={startCamera}>Open camera</button>}
            {cameraState === "live" && <button className="mini-btn" type="button" onClick={capturePhoto}>Take photo</button>}
            {cameraState === "captured" && <button className="mini-btn" type="button" onClick={retake}>Retake</button>}
          </div>
        </div>
      </div>

      <label className="consent">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>I understand this is a non-secret ballot: authorised election admins can see my name, photo, and selected candidate for verification.</span>
      </label>

      {error && <div className="error-box" role="alert">{error}</div>}
      <button className="primary-btn" type="submit" disabled={!electionOpen || submitting || candidates.length !== 3}>
        {submitting ? "Securely recording…" : electionOpen ? <>Lodge my vote <Send size={15} /></> : "Voting is currently paused"}
      </button>
    </form>
  );
}
