import { createHash, timingSafeEqual } from "node:crypto";
import type { PhoneOtpPurpose } from "@prisma/client";
import { db } from "@/lib/db";
import { enforceRateLimit, enforceRateLimitKey } from "@/lib/rate-limit";

const tenMinutes = 10 * 60 * 1000;
const fifteenMinutes = 15 * 60 * 1000;
const unusedChallengeFilter = { OR: [{ usedAt: null }, { usedAt: { isSet: false } }] };

export class PhoneOtpError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export function normalizePhone(value: string) {
  const phone = value.replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

function developmentCode() {
  if (process.env.NODE_ENV !== "development" || process.env.OTP_MODE === "twilio") return null;
  const code = process.env.OTP_DEV_CODE || "424242";
  if (!/^\d{6}$/.test(code)) throw new PhoneOtpError("OTP_DEV_CODE must contain exactly six digits.", 500);
  return code;
}

function phoneRateKey(scope: string, phone: string) {
  const digest = createHash("sha256").update(phone).digest("hex");
  return scope + ":" + digest;
}

function twilioSettings() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!accountSid || !authToken || !serviceSid) return null;
  return { accountSid, authToken, serviceSid };
}

async function callTwilio(endpoint: string, fields: Record<string, string>) {
  const settings = twilioSettings();
  if (!settings) throw new PhoneOtpError("Phone verification is not configured. Add the Twilio Verify settings.", 503);
  const url = "https://verify.twilio.com/v2/Services/" + encodeURIComponent(settings.serviceSid) + "/" + endpoint;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(settings.accountSid + ":" + settings.authToken).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(fields),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json().catch(() => null) as { status?: string } | null;
  if (!response.ok) throw new PhoneOtpError("SMS verification is temporarily unavailable. Please try again.", 503);
  return result;
}

export async function requestPhoneOtp(request: Request, phone: string, purpose: PhoneOtpPurpose) {
  const localCode = developmentCode();
  const isDevelopment = localCode !== null;
  if (!isDevelopment && !twilioSettings()) {
    throw new PhoneOtpError("Phone verification is not configured. Add the Twilio Verify settings.", 503);
  }
  if (!await enforceRateLimit(request, "phone-otp-request", 8, fifteenMinutes)
    || !await enforceRateLimitKey(phoneRateKey("phone-otp-send", phone), 3, fifteenMinutes)) {
    throw new PhoneOtpError("Too many code requests. Please wait before trying again.", 429);
  }

  const now = new Date();
  const recent = await db.phoneOtpChallenge.findFirst({
    where: { phone, ...unusedChallengeFilter, createdAt: { gte: new Date(now.getTime() - 60_000) } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (recent) throw new PhoneOtpError("Wait one minute before requesting another code.", 429);

  await db.phoneOtpChallenge.deleteMany({ where: { expiresAt: { lte: now } } });
  const challenge = await db.phoneOtpChallenge.create({
    data: { phone, purpose, usedAt: null, attempts: 0, expiresAt: new Date(now.getTime() + tenMinutes) },
    select: { id: true },
  });

  try {
    if (!isDevelopment) await callTwilio("Verifications", { To: phone, Channel: "sms" });
  } catch (error) {
    await db.phoneOtpChallenge.deleteMany({ where: { id: challenge.id, ...unusedChallengeFilter } });
    throw error;
  }
  return {
    challengeId: challenge.id,
    developmentMode: isDevelopment,
    ...(localCode ? { developmentCode: localCode } : {}),
  };
}

export async function verifyPhoneOtp(
  request: Request,
  phone: string,
  challengeId: string,
  code: string,
  purpose: PhoneOtpPurpose,
) {
  if (!await enforceRateLimit(request, "phone-otp-verify", 12, fifteenMinutes)
    || !await enforceRateLimitKey(phoneRateKey("phone-otp-check", phone), 8, fifteenMinutes)) {
    throw new PhoneOtpError("Too many verification attempts. Request a new code later.", 429);
  }

  const now = new Date();
  const challenge = await db.phoneOtpChallenge.findFirst({
    where: { id: challengeId, phone, purpose, ...unusedChallengeFilter, expiresAt: { gt: now } },
  });
  if (!challenge || challenge.attempts >= 5) return false;

  let approved = false;
  const devCode = developmentCode();
  if (devCode !== null) {
    const expected = Buffer.from(devCode);
    const supplied = Buffer.from(code);
    approved = expected.length === supplied.length && timingSafeEqual(expected, supplied);
  } else {
    const result = await callTwilio("VerificationCheck", { To: phone, Code: code });
    approved = result?.status === "approved";
  }

  if (!approved) {
    await db.phoneOtpChallenge.updateMany({
      where: { id: challenge.id, ...unusedChallengeFilter, attempts: { lt: 5 } },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  const consumed = await db.phoneOtpChallenge.updateMany({
    where: { id: challenge.id, phone, purpose, ...unusedChallengeFilter, expiresAt: { gt: now }, attempts: { lt: 5 } },
    data: { usedAt: now },
  });
  return consumed.count === 1;
}
