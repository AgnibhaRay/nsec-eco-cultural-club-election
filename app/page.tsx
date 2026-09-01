import { CheckCircle2, Fingerprint, Leaf } from "lucide-react";
import VotingForm from "@/components/VotingForm";

export default function Home() {
  return (
    <main className="evm-site">
      <header className="evm-site-header">
        <div className="evm-club-brand">
          <span className="evm-club-mark"><Leaf size={21} /></span>
          <span>
            <strong>Eco Cultural Club</strong>
            <small>Netaji Subhas Engineering College</small>
          </span>
        </div>
        <div className="evm-election-label">
          <span>President Election</span>
          <strong>Digital Ballot</strong>
        </div>
      </header>

      <section className="evm-main-grid">
        <aside className="evm-intro">
          <div className="evm-kicker"><span /> Club election portal</div>
          <h1>Your vote.<br /><em>Your club.</em></h1>
          <p>Complete your identity verification, then press the blue button beside your chosen candidate. Just like an EVM, one press records one vote.</p>

          <div className="evm-instruction-card">
            <div><Fingerprint size={19} /><span><strong>1. Verify yourself</strong><small>Enter your registered name and capture a clear photo.</small></span></div>
            <div><CheckCircle2 size={19} /><span><strong>2. Cast your vote</strong><small>Press only the blue button next to your preferred candidate.</small></span></div>
          </div>

          <div className="evm-safety-note">
            <strong>Before you vote</strong>
            <span>The blue candidate button submits immediately. Check the candidate name carefully before pressing it.</span>
          </div>
        </aside>

        <VotingForm />
      </section>

      <footer className="evm-footer">
        <div>
          <span className="footer-dot saffron" />
          <span className="footer-dot white" />
          <span className="footer-dot green" />
        </div>
        <p>
          Independent club election interface inspired by the familiar EVM ballot layout. This website is not an official Election Commission of India service.
        </p>
      </footer>
    </main>
  );
}
