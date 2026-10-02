import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { objectIdSchema } from "@/lib/service-request";
const schema=z.object({category:z.string().trim().min(2).max(80),description:z.string().trim().min(10).max(3000),priority:z.enum(["LOW","NORMAL","HIGH","URGENT"]).default("NORMAL"),assignmentId:objectIdSchema.optional()});
export async function POST(req:Request){const user=await getSession();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});if(user.role!=="CUSTOMER")return NextResponse.json({error:"Only customers can create complaints."},{status:403});const p=schema.safeParse(await req.json());if(!p.success)return NextResponse.json({error:"Add a category and describe the issue in at least 10 characters."},{status:400});if(p.data.assignmentId&&!await db.maidAssignment.findFirst({where:{id:p.data.assignmentId,customerId:user.id}}))return NextResponse.json({error:"Assignment not found."},{status:404});const complaint=await db.complaint.create({data:{...p.data,customerId:user.id}});return NextResponse.json({complaint},{status:201})}
