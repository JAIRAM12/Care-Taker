import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { normalizeIndianPhone } from "@/lib/india";
import { accountDetailsSchema } from "@/lib/account-profile";

const schema = accountDetailsSchema.extend({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(8).max(24),
  experienceYears: z.coerce.number().int().min(0).max(60).default(0),
  serviceArea: z.string().trim().max(160).optional().default(""),
  skills: z.string().max(1000).optional().default(""),
});

async function requireAgencyStaff() {
  const user = await getSession();
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  if (user.role !== "MAID_MANAGER" && user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Agency manager or administrator access required." }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const authorization = await requireAgencyStaff();
  if (authorization.error) return authorization.error;

  const caregivers = await db.user.findMany({
    where: { role: "MAID" },
    select: {
      id: true,
      name: true,
      email: true,
      addressLine: true,
      city: true,
      state: true,
      pincode: true,
      industry: true,
      isActive: true,
      createdAt: true,
      maidProfile: { select: { status: true, experienceYears: true, serviceArea: true, skills: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ caregivers });
}

export async function POST(request: Request) {
  const authorization = await requireAgencyStaff();
  if (authorization.error) return authorization.error;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Check the caregiver's contact, address, industry, and PIN code." }, { status: 400 });

  const phone = normalizeIndianPhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }
  if (await db.phoneIdentity.findUnique({ where: { phone } })) {
    return NextResponse.json({ error: "This phone number is already linked to an account." }, { status: 409 });
  }

  const skills = parsed.data.skills.split(",").map((skill) => skill.trim()).filter(Boolean).slice(0, 20);
  try {
    const caregiver = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: parsed.data.name,
          email,
          passwordHash: null,
          role: "MAID",
          addressLine: parsed.data.addressLine,
          city: parsed.data.city,
          state: parsed.data.state,
          pincode: parsed.data.pincode,
          industry: parsed.data.industry,
          phoneIdentity: { create: { phone } },
          maidProfile: {
            create: {
              experienceYears: parsed.data.experienceYears,
              serviceArea: parsed.data.serviceArea || null,
              skills,
              status: "PENDING",
            },
          },
        },
        select: { id: true, name: true, email: true, isActive: true, createdAt: true, maidProfile: { select: { status: true } } },
      });
      await tx.activityLog.create({ data: { actorId: authorization.user.id, action: "CAREGIVER_CREATED", entityType: "User", entityId: created.id } });
      return created;
    });
    return NextResponse.json({ caregiver }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "That email or phone number is already registered." }, { status: 409 });
    }
    console.error("Caregiver creation failed:", error);
    return NextResponse.json({ error: "Could not create the caregiver account." }, { status: 500 });
  }
}
