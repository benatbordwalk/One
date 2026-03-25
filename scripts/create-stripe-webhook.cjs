/**
 * One-time: register Stripe webhooks for this app (Production or Test, from the key you use).
 *
 * Usage:
 *   WEBHOOK_BASE_URL=https://your-project.vercel.app STRIPE_SECRET_KEY=sk_test_... node scripts/create-stripe-webhook.cjs
 *
 * Or:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/create-stripe-webhook.cjs https://your-project.vercel.app
 *
 * Copy the printed STRIPE_WEBHOOK_SECRET (whsec_...) into Vercel env.
 */
const Stripe = require("stripe");

const EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  const base =
    process.env.WEBHOOK_BASE_URL ||
    process.argv[2] ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (!key) {
    console.error("Missing STRIPE_SECRET_KEY in the environment.\n");
    process.exit(1);
  }
  if (!base) {
    console.error(
      "Set WEBHOOK_BASE_URL or NEXT_PUBLIC_APP_URL, or pass the site URL as the first argument.\n" +
        "Example: node scripts/create-stripe-webhook.cjs https://your-app.vercel.app\n",
    );
    process.exit(1);
  }

  const url = `${String(base).replace(/\/$/, "")}/api/webhook`;
  const stripe = new Stripe(key);

  const endpoint = await stripe.webhookEndpoints.create({
    url,
    enabled_events: EVENTS,
    description: "Propeller — subscriptions & entitlements",
  });

  console.log("\nStripe webhook created.\n");
  console.log("  Dashboard: https://dashboard.stripe.com/webhooks (match Test/Live to your key)\n");
  console.log("  Endpoint ID:", endpoint.id);
  console.log("  URL:", endpoint.url);
  console.log("\nAdd this to Vercel as STRIPE_WEBHOOK_SECRET:\n");
  console.log(endpoint.secret);
  console.log("\n");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
