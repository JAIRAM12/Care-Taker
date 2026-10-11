import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { accountDetailsSchema, formatIndiaAddress } from "@/lib/account-profile";

export async function PATCH(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const parsed = accountDetailsSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a complete address, valid Indian PIN code, and industry." }, { status: 400 });

  const details = parsed.data;
  const address = formatIndiaAddress(details);
  await db.user.update({
    where: { id: user.id },
    data: {
      addressLine: details.addressLine,
      city: details.city,
      state: details.state,
      pincode: details.pincode,
      industry: details.industry,
    },
  });
  if (user.role === "CUSTOMER") {
    await db.customerProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, address },
      update: { address },
    });
  }
  return NextResponse.json({ ok: true, profileComplete: true });
}
