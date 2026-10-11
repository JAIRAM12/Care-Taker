import { loadEnvConfig } from "@next/env";
import { PrismaClient, Role } from "@prisma/client";

loadEnvConfig(process.cwd());
const db = new PrismaClient();
const users: Array<{ email: string; name: string; role: Role; phone: string; addressLine: string; city: string; state: string; pincode: string; industry: string }> = [
  { email: "admin@careconnect.local", name: "CareConnect Admin", role: "ADMIN", phone: "+919000001101", addressLine: "1 Sample Street", city: "Bengaluru", state: "Karnataka", pincode: "560001", industry: "Care services" },
  { email: "manager@careconnect.local", name: "Care Manager", role: "MAID_MANAGER", phone: "+919000001102", addressLine: "2 Sample Street", city: "Bengaluru", state: "Karnataka", pincode: "560001", industry: "Care services" },
  { email: "customer@careconnect.local", name: "Sample Customer", role: "CUSTOMER", phone: "+919000001103", addressLine: "3 Sample Street", city: "Bengaluru", state: "Karnataka", pincode: "560001", industry: "Education" },
  { email: "caregiver@careconnect.local", name: "Sample Caregiver", role: "MAID", phone: "+919000001104", addressLine: "4 Sample Street", city: "Bengaluru", state: "Karnataka", pincode: "560001", industry: "Care services" },
];

const previousDemoPhones: Record<string, string> = {
  "admin@careconnect.local": "+15555550101",
  "manager@careconnect.local": "+15555550102",
  "customer@careconnect.local": "+15555550103",
  "caregiver@careconnect.local": "+15555550104",
};

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to create development demo accounts in production.");
  }

  for (const userData of users) {
    const { phone, ...userFields } = userData;
    const user = await db.user.upsert({
      where: { email: userData.email },
      update: {
        name: userFields.name,
        role: userFields.role,
        addressLine: userFields.addressLine,
        city: userFields.city,
        state: userFields.state,
        pincode: userFields.pincode,
        industry: userFields.industry,
        passwordHash: null,
        isActive: true,
      },
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

    const [existingPhone, newPhoneOwner] = await Promise.all([
      db.phoneIdentity.findUnique({ where: { userId: user.id } }),
      db.phoneIdentity.findUnique({ where: { phone }, select: { userId: true } }),
    ]);
    if (newPhoneOwner && newPhoneOwner.userId !== user.id) {
      throw new Error("Demo phone " + phone + " is already linked to a different account.");
    }
    if (existingPhone && existingPhone.phone !== phone) {
      if (existingPhone.phone !== previousDemoPhones[user.email]) {
        throw new Error("Demo user " + user.email + " already has a non-demo phone linked; refusing to replace it.");
      }
      await db.phoneIdentity.delete({ where: { userId: user.id } });
      await db.phoneIdentity.create({ data: { phone, userId: user.id } });
    } else if (!existingPhone) {
      await db.phoneIdentity.create({ data: { phone, userId: user.id } });
    }
    if (userFields.role === "CUSTOMER") {
      await db.customerProfile.updateMany({ where: { userId: user.id }, data: { phone } });
    }
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
