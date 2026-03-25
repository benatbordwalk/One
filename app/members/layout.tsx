import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { emailHasMemberAccess } from "@/lib/subscription";

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) redirect("/login?callbackUrl=/members");

  const subscribed = await emailHasMemberAccess(email);
  if (!subscribed) {
    redirect("/?needs_sub=1");
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "0.75rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <Link href="/members" style={{ fontWeight: 600, color: "var(--fg)", textDecoration: "none" }}>
          Propeller · Members
        </Link>
        <nav style={{ display: "flex", gap: "1rem", fontSize: "0.875rem" }}>
          <Link href="/" style={{ color: "var(--muted)" }}>
            Home
          </Link>
          <Link href="/api/auth/signout?callbackUrl=/" style={{ color: "var(--muted)" }}>
            Sign out
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
