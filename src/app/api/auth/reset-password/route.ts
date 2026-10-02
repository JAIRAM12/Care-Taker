import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  password: z.string().min(10).max(72),
});
const tokenDigest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function POST(request: Request) {
  try {
    if (!await enforceRateLimit(request, "reset-password", 8)) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Use a valid reset link and a password with at least 10 characters." }, { status: 400 });
    }

    const now = new Date();
    const resetToken = await db.passwordResetToken.findUnique({
      where: { tokenHash: tokenDigest(parsed.data.token) },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) {
      return NextResponse.json({ error: "This reset link is invalid or expired. Request a new one." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const changed = await db.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: resetToken.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) return false;

      const user = await tx.user.findUnique({ where: { id: resetToken.userId }, select: { sessionVersion: true } });
      if (!user) return false;

      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          sessionVersion: { set: (user.sessionVersion ?? 0) + 1 },
        },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: resetToken.userId, usedAt: null },
        data: { usedAt: now },
      });
      return true;
    });

    if (!changed) return NextResponse.json({ error: "This reset link is invalid or expired. Request a new one." }, { status: 400 });
    return NextResponse.json({ message: "Your password has been reset. Sign in with your new password." });
  } catch (error) {
    console.error("Reset password API failed:", error);
    return NextResponse.json({ error: "Password reset is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
