import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { accountDetailsSchema } from "../src/lib/account-profile";
import { normalizeIndianPhone } from "../src/lib/india";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const phoneInput = process.env.ADMIN_PHONE?.trim();
  const phone = phoneInput ? normalizeIndianPhone(phoneInput) : null;
  if (!name || name.length < 2 || name.length > 80) throw new Error("Set ADMIN_NAME (2-80 characters).");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Set a valid ADMIN_EMAIL.");
  if (!phone) throw new Error("Set ADMIN_PHONE to a valid 10-digit Indian mobile number. The +91 prefix is added automatically.");

  const accountDetails = accountDetailsSchema.safeParse({
    addressLine: process.env.ADMIN_ADDRESS_LINE,
    city: process.env.ADMIN_CITY,
    state: process.env.ADMIN_STATE,
    pincode: process.env.ADMIN_PINCODE,
    industry: process.env.ADMIN_INDUSTRY,
  });
  if (!accountDetails.success) throw new Error("Set valid ADMIN_ADDRESS_LINE, ADMIN_CITY, ADMIN_STATE, ADMIN_PINCODE, and ADMIN_INDUSTRY values.");

  if (await db.user.count({ where: { role: "ADMIN" } })) {
    throw new Error("An administrator already exists. This bootstrap command only creates the first administrator.");
  }
  if (await db.user.findUnique({ where: { email } })) {
    throw new Error("That email is already in use. Choose another address.");
  }
  if (await db.phoneIdentity.findUnique({ where: { phone } })) {
    throw new Error("That phone number is already linked to an account.");
  }

  await db.user.create({
    data: {
      name,
      email,
      role: "ADMIN",
      passwordHash: null,
      ...accountDetails.data,
      phoneIdentity: { create: { phone } },
      adminProfile: { create: {} },
    },
  });
  console.log("Created the first administrator. Sign in with phone OTP.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => {
  await db.$disconnect();
});
