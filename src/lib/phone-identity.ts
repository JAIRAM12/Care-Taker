import type { User } from "@prisma/client";
import { db } from "@/lib/db";

export type PhoneAccountResolution =
  | { status: "found"; user: User }
  | { status: "none" }
  | { status: "ambiguous" };

export async function resolvePhoneAccount(phone: string): Promise<PhoneAccountResolution> {
  const linked = await db.phoneIdentity.findUnique({ where: { phone }, include: { user: true } });
  if (linked) return { status: "found", user: linked.user };

  const [customers, managers] = await Promise.all([
    db.customerProfile.findMany({ where: { phone }, select: { user: true } }),
    db.managerProfile.findMany({ where: { phone }, select: { user: true } }),
  ]);
  const candidates = new Map<string, User>();
  for (const profile of [...customers, ...managers]) candidates.set(profile.user.id, profile.user);
  if (candidates.size === 0) return { status: "none" };
  if (candidates.size > 1) return { status: "ambiguous" };

  const user = candidates.values().next().value as User;
  try {
    const identity = await db.phoneIdentity.create({ data: { phone, userId: user.id }, include: { user: true } });
    return { status: "found", user: identity.user };
  } catch {
    const raced = await db.phoneIdentity.findUnique({ where: { phone }, include: { user: true } });
    return raced ? { status: "found", user: raced.user } : { status: "ambiguous" };
  }
}
