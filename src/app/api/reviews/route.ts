import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { objectIdSchema } from "@/lib/service-request";
const schema=z.object({assignmentId:objectIdSchema,rating:z.number().int().min(1).max(5),comment:z.string().max(2000).optional()});
export async function POST(req:Request){const user=await getSession();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});if(user.role!=="CUSTOMER")return NextResponse.json({error:"Only customers can submit service reviews."},{status:403});const p=schema.safeParse(await req.json());if(!p.success)return NextResponse.json({error:"Choose a rating from 1 to 5."},{status:400});const a=await db.maidAssignment.findFirst({where:{id:p.data.assignmentId,customerId:user.id,status:"COMPLETED"},include:{maid:{include:{maidProfile:true}}}});if(!a?.maid.maidProfile)return NextResponse.json({error:"Only completed assignments can be reviewed."},{status:400});try{const review=await db.review.create({data:{assignmentId:a.id,customerId:user.id,maidProfileId:a.maid.maidProfile.id,rating:p.data.rating,comment:p.data.comment}});return NextResponse.json({review},{status:201})}catch{return NextResponse.json({error:"A review may already exist for this assignment."},{status:409})}}
