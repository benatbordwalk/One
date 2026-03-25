import { prisma } from "@/lib/prisma";
import { normalizeMemberEmail } from "@/lib/member-email";

const ACCESS = new Set(["active", "trialing"]);

/** Member access from Entitlement row (Stripe webhooks + optional checkout link). */
export async function emailHasMemberAccess(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const key = normalizeMemberEmail(email);
  const row = await prisma.entitlement.findUnique({ where: { email: key } });
  if (!row) return false;
  return ACCESS.has(row.status);
}
