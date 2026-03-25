"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useRef, useState } from "react";

function postCheckoutLoginUrl(subscribed: string | null, sessionId: string | null): string {
  const path =
    subscribed === "1" && sessionId
      ? `/?subscribed=1&session_id=${encodeURIComponent(sessionId)}`
      : "/";
  return `/login?callbackUrl=${encodeURIComponent(path)}`;
}

function HomeContent() {
  const sp = useSearchParams();
  const { data: session, status } = useSession();
  const subscribed = sp.get("subscribed");
  const canceled = sp.get("canceled");
  const needsSub = sp.get("needs_sub");
  const sessionId = sp.get("session_id");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const linkAttempted = useRef(false);

  const signedInWithEmail = status === "authenticated" && !!session?.user?.email;

  useEffect(() => {
    if (subscribed !== "1" || !sessionId) return;
    if (status !== "authenticated" || !session?.user?.email) return;
    if (linkAttempted.current) return;
    linkAttempted.current = true;
    setLinking(true);
    setLinkError(null);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/entitlement/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = (await res.json()) as { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setLinkError(data.error || "Could not link this payment to your email.");
          linkAttempted.current = false;
          return;
        }
        window.history.replaceState({}, "", "/?subscribed=1");
      } catch {
        if (!cancelled) {
          setLinkError("Could not link this payment.");
          linkAttempted.current = false;
        }
      } finally {
        if (!cancelled) setLinking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [subscribed, sessionId, status, session?.user?.email]);

  async function subscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (res.status === 401) {
        setError(data.error || "Sign in with your email first.");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) window.location.href = data.url as string;
      else throw new Error("No checkout URL");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: "4rem 1.5rem",
      }}
    >
      <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0 0 0.5rem" }}>
        Propeller
      </p>
      <h1 style={{ fontSize: "2rem", fontWeight: 600, margin: "0 0 1rem", letterSpacing: "-0.02em" }}>
        Sell your knowledge on subscription
      </h1>
      <p style={{ color: "var(--muted)", margin: "0 0 2rem" }}>
        Members sign in with a magic link, pay in Stripe, and get access tied to the same email.
      </p>

      {needsSub && (
        <p
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
          }}
        >
          No active subscription for this email. Subscribe while signed in, or return from Stripe and sign
          in with the same email you used at checkout.{" "}
          <Link href={`/login?callbackUrl=${encodeURIComponent("/members")}`}>Sign in</Link>
        </p>
      )}
      {subscribed === "1" && sessionId && status === "unauthenticated" && (
        <p
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
          }}
        >
          <Link href={postCheckoutLoginUrl(subscribed, sessionId)}>Sign in with email</Link> to attach this
          payment — use the same address you entered in Stripe.
        </p>
      )}
      {linking && (
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Linking your subscription…</p>
      )}
      {linkError && (
        <p style={{ color: "#f87171", marginBottom: "1rem" }} role="alert">
          {linkError}
        </p>
      )}
      {subscribed && (
        <p
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
          }}
        >
          Payment received — open <Link href="/members">Members</Link>
          {linking ? " (linking…)" : ""}. If access lags, refresh after a few seconds.
        </p>
      )}
      {canceled && (
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Checkout canceled.</p>
      )}
      {error && (
        <p style={{ color: "#f87171", marginBottom: "1rem" }} role="alert">
          {error}
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        {signedInWithEmail ? (
          <button
            type="button"
            onClick={() => void subscribe()}
            disabled={loading}
            style={{
              background: "var(--accent)",
              color: "#0a0a0b",
              border: "none",
              borderRadius: 8,
              padding: "0.875rem 1.25rem",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.85 : 1,
            }}
          >
            {loading ? "Redirecting…" : "Subscribe"}
          </button>
        ) : (
          <Link
            href={postCheckoutLoginUrl(subscribed, sessionId)}
            style={{
              background: "var(--accent)",
              color: "#0a0a0b",
              border: "none",
              borderRadius: 8,
              padding: "0.875rem 1.25rem",
              fontSize: "1rem",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Sign in with email to subscribe
          </Link>
        )}
        <Link
          href="/login"
          style={{
            color: "var(--fg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0.875rem 1.25rem",
            fontSize: "1rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Member sign-in
        </Link>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ padding: "4rem 1.5rem", color: "var(--muted)" }}>Loading…</div>}>
      <HomeContent />
    </Suspense>
  );
}
