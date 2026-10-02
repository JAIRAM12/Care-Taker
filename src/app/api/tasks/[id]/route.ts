import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
const schema=z.object({status:z.enum(["IN_PROGRESS","COMPLETED"])});
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){const user=await getSession();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});if(user.role!=="MAID")return NextResponse.json({error:"Caregiver access required."},{status:403});const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:"Invalid task status."},{status:400});const {id}=await params;const task=await db.task.findFirst({where:{id,assignment:{maidId:user.id,status:{in:["MAID_ACCEPTED","ACTIVE"]}}}});if(!task)return NextResponse.json({error:"Task not found."},{status:404});const updated=await db.task.update({where:{id},data:{status:parsed.data.status,completedAt:parsed.data.status==="COMPLETED"?new Date():null}});return NextResponse.json({task:updated})}
