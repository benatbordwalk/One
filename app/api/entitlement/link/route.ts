import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { linkCheckoutSessionToEmail } from "@/lib/link-checkout-session";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Sign in with your email first." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId =
    typeof body === "object" &&
    body !== null &&
    "sessionId" in body &&
    typeof (body as { sessionId: unknown }).sessionId === "string"
      ? (body as { sessionId: string }).sessionId
      : null;

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Valid Stripe Checkout session ID required." }, { status: 400 });
  }

  const result = await linkCheckoutSessionToEmail(sessionId, email);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ linked: true });
}
