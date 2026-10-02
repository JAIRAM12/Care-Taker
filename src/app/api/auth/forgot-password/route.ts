import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/password-reset-email";

const schema = z.object({ email: z.string().trim().email().max(254) });
const genericMessage = "If an account with that email exists, we sent a password reset link.";
const tokenDigest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function POST(request: Request) {
  try {
    if (!await enforceRateLimit(request, "forgot-password", 5)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

    const email = parsed.data.email.toLowerCase();
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return NextResponse.json({ message: genericMessage });

    const now = new Date();
    await db.passwordResetToken.deleteMany({ where: { expiresAt: { lte: now } } });
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    });

    const token = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenDigest(token),
        expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
      },
    });

    const appUrl = process.env.APP_URL || (process.env.NODE_ENV === "production" ? undefined : "http://localhost:5173");
    if (!appUrl) throw new Error("APP_URL must be configured in production.");
    const resetUrl = new URL("/reset-password", appUrl);
    resetUrl.searchParams.set("token", token);

    try {
      await sendPasswordResetEmail(email, resetUrl.toString());
    } catch (error) {
      await db.passwordResetToken.updateMany({
        where: { tokenHash: tokenDigest(token), usedAt: null },
        data: { usedAt: new Date() },
      });
      console.error("Password reset email delivery failed:", error);
    }

    return NextResponse.json({ message: genericMessage });
  } catch (error) {
    console.error("Forgot password API failed:", error);
    return NextResponse.json({ error: "Password reset is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
