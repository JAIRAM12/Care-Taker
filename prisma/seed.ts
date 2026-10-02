import { loadEnvConfig } from "@next/env";
import { PrismaClient, Role } from "@prisma/client";

loadEnvConfig(process.cwd());
const db = new PrismaClient();
const users: Array<{ email: string; name: string; role: Role; phone: string }> = [
  { email: "admin@careconnect.local", name: "CareConnect Admin", role: "ADMIN", phone: "+15555550101" },
  { email: "manager@careconnect.local", name: "Care Manager", role: "MAID_MANAGER", phone: "+15555550102" },
  { email: "customer@careconnect.local", name: "Sample Customer", role: "CUSTOMER", phone: "+15555550103" },
  { email: "caregiver@careconnect.local", name: "Sample Caregiver", role: "MAID", phone: "+15555550104" },
];

async function main() {
  for (const userData of users) {
    const { phone, ...userFields } = userData;
    const user = await db.user.upsert({
      where: { email: userData.email },
      update: { name: userFields.name, role: userFields.role, passwordHash: null, isActive: true },
      create: {
        ...userFields,
        passwordHash: null,
        ...(userFields.role === "CUSTOMER" ? { customerProfile: { create: { phone } } } : {}),
        ...(userFields.role === "MAID" ? {
          maidProfile: {
            create: {
              bio: "Development sample profile",
              experienceYears: 3,
              skills: ["Companionship", "Meal preparation"],
              servicePreferences: ["Daytime visits"],
              serviceArea: "Sample City",
              status: "VERIFIED",
            },
          },
        } : {}),
        ...(userFields.role === "ADMIN" ? { adminProfile: { create: {} } } : {}),
        ...(userFields.role === "MAID_MANAGER" ? { managerProfile: { create: {} } } : {}),
      },
    });

    const existingPhone = await db.phoneIdentity.findUnique({ where: { userId: user.id } });
    if (existingPhone && existingPhone.phone !== phone) {
      throw new Error("Demo user " + user.email + " already has another phone linked; refusing to replace it.");
    }
    if (!existingPhone) await db.phoneIdentity.create({ data: { phone, userId: user.id } });
  }

  for (const [name, description] of [
    ["Companion care", "Friendly non-medical companionship and everyday support."],
    ["Home assistance", "Help with everyday household routines."],
    ["Meal preparation", "Support with planning and preparing meals."],
  ] as const) {
    const service = await db.service.findFirst({ where: { name } });
    if (service) await db.service.update({ where: { id: service.id }, data: { description, isActive: true } });
    else await db.service.create({ data: { name, description } });
  }

  console.log("Seeded demo users, linked phone numbers, and services. Development OTP: " + (process.env.OTP_DEV_CODE || "424242"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await db.$disconnect();
});
