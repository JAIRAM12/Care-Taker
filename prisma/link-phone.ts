import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

async function main() {
  const email = process.env.LINK_USER_EMAIL?.trim().toLowerCase();
  const phone = process.env.LINK_USER_PHONE?.replace(/[\s().-]/g, "");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Set LINK_USER_EMAIL to the existing account email.");
  }
  if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error("Set LINK_USER_PHONE in international E.164 format, such as +14155550100.");
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true },
  });
  if (!user) throw new Error("No account was found with that email.");

  const phoneOwner = await db.phoneIdentity.findUnique({
    where: { phone },
    select: { userId: true },
  });
  if (phoneOwner && phoneOwner.userId !== user.id) {
    throw new Error("That phone number is already linked to a different account.");
  }

  const existingIdentity = await db.phoneIdentity.findUnique({
    where: { userId: user.id },
    select: { phone: true },
  });
  if (existingIdentity && existingIdentity.phone !== phone) {
    throw new Error("This account already has another phone number linked. Contact an administrator to change it safely.");
  }
  if (!existingIdentity) {
    await db.phoneIdentity.create({ data: { phone, userId: user.id } });
  }

  console.log("Linked the phone number to " + user.role + " account " + user.email + ". Verify it with OTP at next sign-in.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => {
  await db.$disconnect();
});
