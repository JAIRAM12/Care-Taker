import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const services = await db.service.findMany({
    where: { isActive: true },
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ services });
}
