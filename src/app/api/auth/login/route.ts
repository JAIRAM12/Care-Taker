import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, dashboardForRole } from "@/lib/auth";
import { PhoneOtpError, normalizePhone, requestPhoneOtp, verifyPhoneOtp } from "@/lib/phone-otp";
import { resolvePhoneAccount } from "@/lib/phone-identity";

const phoneSchema = z.string().trim().min(8).max(24);
const requestSchema = z.object({
  action: z.literal("request"),
  phone: phoneSchema,
  purpose: z.enum(["LOGIN", "REGISTER"]),
});
const verifySchema = z.object({
  action: z.literal("verify"),
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/),
  challengeId: z.string().min(20).max(30),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestParsed = requestSchema.safeParse(body);
    if (requestParsed.success) {
      const phone = normalizePhone(requestParsed.data.phone);
      if (!phone) return NextResponse.json({ error: "Enter a valid international phone number, including the + and country code." }, { status: 400 });
      const result = await requestPhoneOtp(request, phone, requestParsed.data.purpose);
      return NextResponse.json({ message: "If this number can receive messages, a sign-in code is on its way.", ...result });
    }

    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Enter your phone number and the six-digit code." }, { status: 400 });
    const phone = normalizePhone(parsed.data.phone);
    if (!phone) return NextResponse.json({ error: "Enter a valid international phone number." }, { status: 400 });
    const valid = await verifyPhoneOtp(request, phone, parsed.data.challengeId, parsed.data.code, "LOGIN");
    if (!valid) return NextResponse.json({ error: "That code is invalid or expired. Request a new code and try again." }, { status: 401 });

    const resolution = await resolvePhoneAccount(phone);
    if (resolution.status === "ambiguous") {
      return NextResponse.json({ error: "This phone number is linked to multiple accounts. Contact your agency administrator." }, { status: 409 });
    }
    if (resolution.status === "none") {
      return NextResponse.json({ error: "No CareConnect account is linked to this number. Customers can create an account; staff should contact their administrator." }, { status: 404 });
    }
    const user = resolution.user;
    if (!user.isActive) return NextResponse.json({ error: "This account is inactive. Contact your agency administrator." }, { status: 403 });

    await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });
    return NextResponse.json({ redirect: dashboardForRole(user.role) });
  } catch (error) {
    if (error instanceof PhoneOtpError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Phone sign-in is temporarily unavailable." }, { status: 503 });
  }
}
