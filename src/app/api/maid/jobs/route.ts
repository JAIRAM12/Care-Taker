import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "MAID") return NextResponse.json({ error: "Caregiver access required." }, { status: 403 });

  const jobs = await db.maidAssignment.findMany({
    where: { maidId: user.id, status: { notIn: ["COMPLETED", "CANCELLED", "MAID_REJECTED"] } },
    include: {
      customer: { select: { name: true } },
      request: { include: { service: true } },
      tasks: true,
      attendance: { orderBy: { checkIn: "desc" }, take: 1 },
    },
    orderBy: { assignedAt: "desc" },
  });
  return NextResponse.json({ jobs });
}
