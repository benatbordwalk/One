/**
 * NextAuth — email magic link only (Resend).
 * Docs: https://next-auth.js.org/providers/email
 */
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { sendMagicLinkEmail } from "@/lib/auth-email";

export function buildAuthProviders(): NextAuthOptions["providers"] {
  return [
    EmailProvider({
      maxAge: 15 * 60,
      from: process.env.AUTH_EMAIL_FROM || "Propeller <onboarding@resend.dev>",
      async sendVerificationRequest({ identifier, url }) {
        await sendMagicLinkEmail(identifier, url);
      },
    }),
  ];
}
