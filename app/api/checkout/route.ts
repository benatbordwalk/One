import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { normalizeMemberEmail } from "@/lib/member-email";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const rawEmail = session?.user?.email;
  if (!rawEmail) {
    return NextResponse.json({ error: "Sign in with your email before subscribing." }, { status: 401 });
  }

  const memberEmail = normalizeMemberEmail(rawEmail);
  const priceId = process.env.STRIPE_PRICE_ID;
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get("origin") ||
    "";

  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_PRICE_ID is not set" },
      { status: 500 },
    );
  }
  if (!base) {
    return NextResponse.json(
      { error: "Set NEXT_PUBLIC_APP_URL for success/cancel URLs" },
      { status: 500 },
    );
  }

  try {
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base.replace(
        /\/$/,
        "",
      )}/?subscribed=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base.replace(/\/$/, "")}/?canceled=1`,
      allow_promotion_codes: true,
      client_reference_id: memberEmail,
      metadata: {
        member_email: memberEmail,
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "No session URL" }, { status: 500 });
    }
    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
