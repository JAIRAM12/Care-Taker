import { db } from "@/lib/db";

export async function enforceRateLimitKey(key: string, limit = 8, windowMs = 15 * 60 * 1000) {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const bucket = await db.rateLimitBucket.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, hits: 1 },
    update: { hits: { increment: 1 } },
  });
  return bucket.hits <= limit;
}

export async function enforceRateLimit(request: Request, scope: string, limit = 8, windowMs = 15 * 60 * 1000) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const identity = forwarded || request.headers.get("x-real-ip") || "unknown";
  return enforceRateLimitKey(scope + ":" + identity, limit, windowMs);
}
