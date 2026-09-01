import { Leaf } from "lucide-react";
import VotingForm from "@/components/VotingForm";

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Leaf size={19} /></span>
          <span className="brand-copy">
            <strong>Eco Cultural Club</strong>
            <span>Netaji Subhas Engineering College</span>
          </span>
        </div>
        <span className="status-pill"><span className="status-dot" /> President election</span>
      </header>

      <section className="hero">
        <div className="hero-grid">
          <div>
            <div className="eyebrow">Make your voice count</div>
            <h1>Choose the next <em>president.</em></h1>
            <p className="hero-copy">
              Your club, your future, your choice. Review the three candidates, verify your identity with a quick photo, and cast one secure vote.
            </p>
            <div className="steps" aria-label="Voting steps">
              <div className="step"><span>1</span> Identify</div>
              <div className="step"><span>2</span> Choose</div>
              <div className="step"><span>3</span> Verify</div>
            </div>
          </div>
          <VotingForm />
        </div>
      </section>
      <p className="privacy-note">One member, one vote. Selfies are stored in a private bucket and should be deleted after the election retention period.</p>
    </main>
  );
}
