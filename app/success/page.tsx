import Link from "next/link";
import { Check } from "lucide-react";

export default function SuccessPage() {
  return (
    <main className="center-page">
      <section className="success-card">
        <div className="success-icon"><Check size={34} strokeWidth={2.5} /></div>
        <h1>Vote recorded.</h1>
        <p>Thank you for taking part in the Eco Cultural Club president election. Your ballot has been securely lodged.</p>
        <Link className="text-link" href="/">Return to election home</Link>
      </section>
    </main>
  );
}
