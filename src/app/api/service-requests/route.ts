import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { serviceRequestSchema } from "@/lib/service-request";
export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Please sign in to create a request." }, { status: 401 });
  if (user.role !== "CUSTOMER") return NextResponse.json({ error: "Only customers can create service requests." }, { status: 403 });
  const parsed = serviceRequestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Review the request details and try again." }, { status: 400 });
  try {
    const service = await db.service.findFirst({ where: { id: parsed.data.serviceId, isActive: true } });
    if (!service) return NextResponse.json({ error: "That service is unavailable." }, { status: 404 });
    const item = await db.serviceRequest.create({ data: { ...parsed.data, customerId: user.id, preferredDate: new Date(parsed.data.preferredDate) } });
    await db.notification.create({ data: { userId: user.id, title: "Request received", message: "Your care request is now in the manager review queue." } });
    await db.activityLog.create({ data: { actorId: user.id, action: "SERVICE_REQUEST_CREATED", entityType: "ServiceRequest", entityId: item.id } });
    return NextResponse.json({ request: item }, { status: 201 });
  } catch { return NextResponse.json({ error: "Could not save your request. Please try again." }, { status: 500 }); }
}
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const where = user.role === "CUSTOMER" ? { customerId: user.id } : ["MAID_MANAGER", "ADMIN"].includes(user.role) ? {} : null;
  if (!where) return NextResponse.json({ error: "You do not have permission to view requests." }, { status: 403 });
  return NextResponse.json({ requests: await db.serviceRequest.findMany({ where, include: { service: true, customer: { select: { name: true } }, assignments: { include: { maid: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } }) });
}
