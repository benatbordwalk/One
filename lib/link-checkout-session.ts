import type { Stripe } from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { normalizeMemberEmail } from "@/lib/member-email";

const PAID = new Set(["paid", "no_payment_required"]);
const MAX_AGE_SEC = 7 * 24 * 60 * 60;

function customerId(cus: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!cus) return null;
  return typeof cus === "string" ? cus : cus.id;
}

function subscriptionRef(
  sub: string | Stripe.Subscription | null | undefined,
): { id: string | null; object: Stripe.Subscription | null } {
  if (!sub) return { id: null, object: null };
  if (typeof sub === "string") return { id: sub, object: null };
  if ("object" in sub && sub.object === "subscription") {
    return { id: sub.id, object: sub as Stripe.Subscription };
  }
  return { id: null, object: null };
}

/**
 * Attach a completed Checkout Session to the signed-in member email (normalized).
 */
export async function linkCheckoutSessionToEmail(
  checkoutSessionId: string,
  memberEmail: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) return { ok: false, status: 500, error: "STRIPE_PRICE_ID missing" };

  const email = normalizeMemberEmail(memberEmail);
  const stripe = getStripe();
  const sess = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["subscription"],
  });

  if (sess.mode !== "subscription") {
    return { ok: false, status: 400, error: "Not a subscription checkout" };
  }

  if (sess.status !== "complete") {
    return { ok: false, status: 400, error: "Checkout session incomplete" };
  }

  if (!PAID.has(sess.payment_status ?? "")) {
    return { ok: false, status: 400, error: "Payment not completed" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - sess.created > MAX_AGE_SEC) {
    return { ok: false, status: 400, error: "This checkout link has expired; contact support." };
  }

  const refRaw = sess.client_reference_id ?? sess.metadata?.member_email;
  const ref = refRaw ? normalizeMemberEmail(refRaw) : null;
  if (ref && ref !== email) {
    return {
      ok: false,
      status: 403,
      error: "This payment was started while signed in as a different email.",
    };
  }

  const { id: subIdHint, object: expandedSub } = subscriptionRef(sess.subscription);
  if (!subIdHint) {
    return { ok: false, status: 400, error: "No subscription on this session." };
  }

  const sub =
    expandedSub ?? (await stripe.subscriptions.retrieve(subIdHint, { expand: ["items.data.price"] }));

  const priceOk = sub.items.data.some((item) => item.price?.id === priceId);
  if (!priceOk) {
    return { ok: false, status: 403, error: "Checkout is not for this product." };
  }

  const customer = customerId(sess.customer);
  const subId = sub.id;

  if (subId) {
    const existingSub = await prisma.entitlement.findFirst({
      where: { stripeSubscriptionId: subId },
    });
    if (existingSub && existingSub.email !== email) {
      return {
        ok: false,
        status: 403,
        error: "This subscription is already linked to another member email.",
      };
    }
  }

  if (customer) {
    const existingCust = await prisma.entitlement.findFirst({
      where: { stripeCustomerId: customer },
    });
    if (existingCust && existingCust.email !== email) {
      return {
        ok: false,
        status: 403,
        error: "This Stripe customer is already linked to another member email.",
      };
    }
  }

  await prisma.entitlement.upsert({
    where: { email },
    create: {
      email,
      stripeCustomerId: customer,
      stripeSubscriptionId: subId,
      status: sub.status,
    },
    update: {
      stripeCustomerId: customer ?? undefined,
      stripeSubscriptionId: subId ?? undefined,
      status: sub.status,
    },
  });

  return { ok: true };
}
