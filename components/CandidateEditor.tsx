"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, Save } from "lucide-react";
import type { Candidate } from "@/lib/types";

function CandidateCard({
  candidate,
  locked,
  onSaved,
}: {
  candidate: Candidate;
  locked: boolean;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(candidate.name);
  const [tagline, setTagline] = useState(candidate.tagline);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState(candidate.photo_url ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function choosePhoto(file: File | null) {
    setPhoto(file);
    if (file) setPreview(URL.createObjectURL(file));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData();
    form.set("name", name);
    form.set("tagline", tagline);
    if (photo) form.set("photo", photo);

    try {
      const response = await fetch(`/api/admin/candidates/${candidate.id}`, { method: "PUT", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not save this candidate.");
      setPhoto(null);
      setMessage("Saved");
      await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this candidate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="candidate-edit-card" onSubmit={save}>
      <div className="candidate-edit-photo">
        {preview ? (
          <Image src={preview} alt={`${name} profile`} fill sizes="120px" unoptimized />
        ) : (
          <span style={{ background: candidate.accent }}>{candidate.ballot_number}</span>
        )}
      </div>
      <label className="photo-upload">
        <ImagePlus size={14} /> {preview ? "Replace photo" : "Add photo"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)}
          disabled={locked || saving}
        />
      </label>
      <label className="field-label" htmlFor={`candidate-name-${candidate.id}`}>Candidate #{candidate.ballot_number}</label>
      <input
        className="text-input"
        id={`candidate-name-${candidate.id}`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={100}
        disabled={locked || saving}
        required
      />
      <label className="field-label candidate-tagline-label" htmlFor={`candidate-tagline-${candidate.id}`}>Short manifesto line</label>
      <input
        className="text-input"
        id={`candidate-tagline-${candidate.id}`}
        value={tagline}
        onChange={(event) => setTagline(event.target.value)}
        maxLength={180}
        disabled={locked || saving}
      />
      <button className="save-candidate-btn" type="submit" disabled={locked || saving || name.trim().length < 2}>
        <Save size={14} /> {saving ? "Saving…" : "Save candidate"}
      </button>
      {message && <span className={message === "Saved" ? "save-message" : "save-message error"}>{message}</span>}
    </form>
  );
}

export default function CandidateEditor({
  candidates,
  locked,
  lockReason,
  onSaved,
}: {
  candidates: Candidate[];
  locked: boolean;
  lockReason: string;
  onSaved: () => Promise<void>;
}) {
  return (
    <section className="candidate-editor records-panel">
      <div className="panel-title">
        <div><span className="card-kicker">Ballot setup</span><h2>Candidate profiles</h2></div>
        {locked && <span className="editor-lock-note">{lockReason}</span>}
      </div>
      <div className="candidate-editor-grid">
        {candidates.map((candidate) => (
          <CandidateCard key={candidate.id} candidate={candidate} locked={locked} onSaved={onSaved} />
        ))}
      </div>
    </section>
  );
}
