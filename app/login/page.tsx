"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginContent() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/members";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);
    try {
      const res = await signIn("email", {
        email: email.trim(),
        callbackUrl,
        redirect: false,
      });
      if (!res?.ok || res.error) {
        setStatus("error");
        setMessage(res?.error ?? "Could not send sign-in email.");
        return;
      }
      setStatus("sent");
      setMessage("Check your inbox for the sign-in link. Use the same email you use in Stripe at checkout.");
    } catch {
      setStatus("error");
      setMessage("Could not send sign-in email.");
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0 0 0.5rem" }}>
        Propeller
      </p>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 600, margin: "0 0 1rem" }}>Sign in</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 1.5rem" }}>
        We&apos;ll email you a magic link. Use the same address you use when you pay in Stripe.
      </p>

      {status === "sent" ? (
        <p style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "1rem" }}>
          {message}
        </p>
      ) : (
        <form onSubmit={onSubmit}>
          <label htmlFor="email" style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.35rem" }}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "0.65rem 0.75rem",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--fg)",
              marginBottom: "1rem",
            }}
          />
          {message && status === "error" && (
            <p style={{ color: "#f87171", marginBottom: "1rem" }} role="alert">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={status === "sending"}
            style={{
              width: "100%",
              background: "var(--accent)",
              color: "#0a0a0b",
              border: "none",
              borderRadius: 8,
              padding: "0.85rem 1.1rem",
              fontWeight: 600,
              cursor: status === "sending" ? "wait" : "pointer",
            }}
          >
            {status === "sending" ? "Sending…" : "Email me a link"}
          </button>
        </form>
      )}

      <p style={{ marginTop: "2rem" }}>
        <Link href="/" style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
          ← Back home
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div style={{ padding: "4rem 1.5rem", color: "var(--muted)" }}>Loading…</div>}
    >
      <LoginContent />
    </Suspense>
  );
}
