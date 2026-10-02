import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const phone = process.env.ADMIN_PHONE?.replace(/[\s().-]/g, "");
  if (!name || name.length < 2 || name.length > 80) throw new Error("Set ADMIN_NAME (2-80 characters).");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Set a valid ADMIN_EMAIL.");
  if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("Set ADMIN_PHONE in international E.164 format, such as +14155550100.");

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
