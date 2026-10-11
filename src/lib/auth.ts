import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";
import { hasRoleAccess } from "@/lib/policy";
import { hasCompleteAccountDetails } from "@/lib/account-profile";

const key = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
  return new TextEncoder().encode(secret);
};
export type SessionUser = { id: string; role: Role; name: string; email: string };
export type SessionWithProfileStatus = SessionUser & { profileComplete: boolean };
export async function createSession(user: SessionUser) {
  const current = await db.user.findUnique({ where: { id: user.id }, select: { isActive: true, sessionVersion: true } });
  if (!current?.isActive) throw new Error("Cannot create a session for an inactive account.");
  const token = await new SignJWT({ ...user, sessionVersion: current.sessionVersion ?? 0 }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(key());
  (await cookies()).set("careconnect_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export async function getSession(): Promise<SessionWithProfileStatus | null> {
  const token = (await cookies()).get("careconnect_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (!payload.id || !payload.role) return null;
    const user = await db.user.findUnique({ where: { id: String(payload.id) }, select: {
      id: true, role: true, name: true, email: true, isActive: true, sessionVersion: true,
      addressLine: true, city: true, state: true, pincode: true, industry: true,
    } });
    const tokenVersion = typeof payload.sessionVersion === "number" ? payload.sessionVersion : 0;
    return user?.isActive && tokenVersion === (user.sessionVersion ?? 0) ? {
      id: user.id, role: user.role, name: user.name, email: user.email,
      profileComplete: hasCompleteAccountDetails(user),
    } : null;
  } catch { return null; }
}
export function dashboardForRole(role: Role) {
  if (role === "CUSTOMER") return "/customer/dashboard";
  if (role === "MAID") return "/maid/dashboard";
  if (role === "MAID_MANAGER") return "/manager/dashboard";
  return "/admin/dashboard";
}
export async function requireRole(roles: Role[]) {
  const user = await getSession();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (!hasRoleAccess(user.role, roles)) throw new Error("FORBIDDEN");
  return user;
}
