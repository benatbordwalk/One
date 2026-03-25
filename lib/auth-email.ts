/** Resend — magic link messages for NextAuth Email provider. */

export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");

  const from = process.env.AUTH_EMAIL_FROM || "Propeller <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your Propeller sign-in link",
      html: `<p>Click to sign in:</p><p><a href="${url}">Sign in to Propeller</a></p><p>If you didn’t request this, ignore this email.</p>`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to send sign-in email");
  }
}
