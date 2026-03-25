import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { normalizeMemberEmail } from "@/lib/member-email";

function customerId(cus: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!cus) return null;
  return typeof cus === "string" ? cus : cus.id;
}

function subscriptionId(sub: string | Stripe.Subscription | null): string | null {
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set" },
      { status: 500 },
    );
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const sess = event.data.object as Stripe.Checkout.Session;
        if (sess.mode !== "subscription") break;
        const raw = sess.client_reference_id ?? sess.metadata?.member_email;
        if (!raw) break;
        const email = normalizeMemberEmail(raw);
        const paid =
          sess.payment_status === "paid" || sess.payment_status === "no_payment_required";
        if (!paid) break;
        const customer = customerId(sess.customer);
        const subId = subscriptionId(sess.subscription);
        await prisma.entitlement.upsert({
          where: { email },
          create: {
            email,
            stripeCustomerId: customer,
            stripeSubscriptionId: subId,
            status: "active",
          },
          update: {
            stripeCustomerId: customer ?? undefined,
            stripeSubscriptionId: subId ?? undefined,
            status: "active",
          },
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const cid = customerId(sub.customer);
        const status = sub.status;
        await prisma.entitlement.updateMany({
          where: {
            OR: [
              { stripeSubscriptionId: sub.id },
              ...(cid ? [{ stripeCustomerId: cid }] : []),
            ],
          },
          data: {
            status,
            stripeSubscriptionId: sub.id,
            ...(cid ? { stripeCustomerId: cid } : {}),
          },
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
