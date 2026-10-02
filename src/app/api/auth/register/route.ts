import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, dashboardForRole } from "@/lib/auth";
import { PhoneOtpError, normalizePhone, verifyPhoneOtp } from "@/lib/phone-otp";
import { resolvePhoneAccount } from "@/lib/phone-identity";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(8).max(24),
  code: z.string().regex(/^\d{6}$/),
  challengeId: z.string().min(20).max(30),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check your name, email, phone number, and six-digit code." }, { status: 400 });
    const phone = normalizePhone(parsed.data.phone);
    if (!phone) return NextResponse.json({ error: "Enter a valid international phone number." }, { status: 400 });
    const verified = await verifyPhoneOtp(request, phone, parsed.data.challengeId, parsed.data.code, "REGISTER");
    if (!verified) return NextResponse.json({ error: "That code is invalid or expired. Request a new code and try again." }, { status: 401 });

    const existingPhone = await resolvePhoneAccount(phone);
    if (existingPhone.status === "found") return NextResponse.json({ error: "This number already has an account. Sign in instead." }, { status: 409 });
    if (existingPhone.status === "ambiguous") return NextResponse.json({ error: "This number is already associated with an agency account. Contact your administrator." }, { status: 409 });
    const email = parsed.data.email.toLowerCase();
    if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash: null,
        role: "CUSTOMER",
        phoneIdentity: { create: { phone } },
        customerProfile: { create: { phone } },
      },
      select: { id: true, name: true, email: true, role: true },
    });
    await createSession(user);
    return NextResponse.json({ redirect: dashboardForRole(user.role) }, { status: 201 });
  } catch (error) {
    if (error instanceof PhoneOtpError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "That email or phone number is already registered. Sign in instead." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });
  }
}
