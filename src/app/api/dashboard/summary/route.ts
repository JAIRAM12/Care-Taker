import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const activeStatuses = ["PENDING", "MAID_ACCEPTED", "ACTIVE"] as const;

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!["CUSTOMER", "MAID", "MAID_MANAGER", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "You do not have permission to view this dashboard." }, { status: 403 });
  }

  const requestWhere: Prisma.ServiceRequestWhereInput = user.role === "CUSTOMER"
    ? { customerId: user.id }
    : user.role === "MAID"
      ? { assignments: { some: { maidId: user.id } } }
      : {};
  const assignmentWhere: Prisma.MaidAssignmentWhereInput = user.role === "CUSTOMER"
    ? { customerId: user.id, status: { in: [...activeStatuses] } }
    : user.role === "MAID"
      ? { maidId: user.id, status: { in: [...activeStatuses] } }
      : { status: { in: [...activeStatuses] } };
  const complaintWhere: Prisma.ComplaintWhereInput = user.role === "CUSTOMER"
    ? { customerId: user.id, status: { in: ["OPEN", "UNDER_REVIEW"] } }
    : { status: { in: ["OPEN", "UNDER_REVIEW"] } };
  const taskWhere: Prisma.TaskWhereInput = {
    assignment: user.role === "MAID"
      ? { maidId: user.id }
      : user.role === "CUSTOMER"
        ? { customerId: user.id }
        : {},
  };

  const [requestCount, verifiedMaidCount, assignmentCount, complaintCount, tasks, notifications, services, maidProfile, managerQueue, availableMaids] = await Promise.all([
    db.serviceRequest.count({ where: requestWhere }),
    db.maidProfile.count({ where: { status: { in: ["VERIFIED", "ACTIVE"] } } }),
    db.maidAssignment.count({ where: assignmentWhere }),
    db.complaint.count({ where: complaintWhere }),
    db.task.findMany({
      where: taskWhere,
      include: { assignment: { include: { request: { include: { service: true } } } } },
      orderBy: { dueAt: "asc" },
      take: 5,
    }),
    db.notification.findMany({ where: { userId: user.id, readAt: null }, orderBy: { createdAt: "desc" }, take: 4 }),
    db.service.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    user.role === "MAID" ? db.maidProfile.findUnique({ where: { userId: user.id }, select: { status: true } }) : null,
    (user.role === "MAID_MANAGER" || user.role === "ADMIN") ? db.serviceRequest.findMany({
      where: { status: { in: ["PENDING", "UNDER_REVIEW", "MATCHING"] } },
      include: { customer: { select: { name: true } }, service: true },
      orderBy: { createdAt: "asc" },
      take: 8,
    }) : [],
    (user.role === "MAID_MANAGER" || user.role === "ADMIN") ? db.user.findMany({
      where: { role: "MAID", isActive: true, maidProfile: { status: { in: ["VERIFIED", "ACTIVE"] } } },
      include: { maidProfile: true },
      orderBy: { name: "asc" },
      take: 20,
    }) : [],
  ]);

  return NextResponse.json({
    metrics: { requests: requestCount, availableCaregivers: verifiedMaidCount, assignments: assignmentCount, openComplaints: complaintCount },
    tasks,
    notifications,
    services,
    caregiverStatus: maidProfile?.status ?? null,
    managerQueue,
    availableMaids: availableMaids.map((maid) => ({ id: maid.id, name: maid.name })),
  });
}
