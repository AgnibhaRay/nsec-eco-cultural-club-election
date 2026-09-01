"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, LockKeyhole } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not sign in.");
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setLoading(false);
    }
  }

  return (
    <main className="center-page">
      <form className="login-card admin-login" onSubmit={login}>
        <div className="brand-mark login-mark"><Leaf size={21} /></div>
        <div className="card-kicker">Restricted access</div>
        <h1>Election admin</h1>
        <p>Sign in with the Supabase account authorised in the admin users table.</p>
        <label className="field-label" htmlFor="email">Email</label>
        <input className="text-input" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <label className="field-label login-password" htmlFor="password">Password</label>
        <input className="text-input" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" minLength={8} required />
        {error && <div className="error-box" role="alert">{error}</div>}
        <button className="primary-btn" disabled={loading} type="submit">
          <LockKeyhole size={15} /> {loading ? "Signing in…" : "Sign in securely"}
        </button>
      </form>
    </main>
  );
}
