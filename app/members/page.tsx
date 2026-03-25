import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function MembersHomePage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? "Member";

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.75rem" }}>Welcome</h1>
      <p style={{ color: "var(--muted)", margin: 0 }}>
        Signed in as <span style={{ color: "var(--fg)" }}>{email}</span>. Replace this page with your library
        or links — access is tied to this email and your Stripe subscription.
      </p>
    </main>
  );
}
