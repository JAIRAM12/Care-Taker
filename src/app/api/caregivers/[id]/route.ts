import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "MAID_MANAGER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Agency manager or administrator access required." }, { status: 403 });
  }

  const { id } = await params;
  const caregiver = await db.user.findFirst({ where: { id, role: "MAID" }, select: { id: true, maidProfile: { select: { id: true } } } });
  if (!caregiver?.maidProfile) return NextResponse.json({ error: "Caregiver not found." }, { status: 404 });

  const activeAssignments = await db.maidAssignment.count({
    where: { maidId: id, status: { notIn: ["COMPLETED", "CANCELLED", "MAID_REJECTED"] } },
  });
  if (activeAssignments > 0) {
    return NextResponse.json({ error: "Reassign or close active assignments before deactivating this caregiver." }, { status: 409 });
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { isActive: false } });
    await tx.maidProfile.update({ where: { id: caregiver.maidProfile!.id }, data: { status: "SUSPENDED" } });
    await tx.activityLog.create({ data: { actorId: user.id, action: "CAREGIVER_DEACTIVATED", entityType: "User", entityId: id } });
  });
  return NextResponse.json({ ok: true });
}