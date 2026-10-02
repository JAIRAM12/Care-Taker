import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession,dashboardForRole } from "@/lib/auth";
import { db } from "@/lib/db";
import RequestForm from "./request-form";
export default async function Page(){const user=await getSession();if(!user)redirect("/login");if(user.role!=="CUSTOMER")redirect(dashboardForRole(user.role));const services=await db.service.findMany({where:{isActive:true},select:{id:true,name:true}});return <main className="mx-auto max-w-4xl px-5 py-8"><Link href="/customer/dashboard" className="text-sm text-[#246b50]">← Back to dashboard</Link><h1 className="mt-5 text-3xl font-semibold">Request care</h1><p className="mb-6 mt-2 text-sm text-[#667578]">A manager will review your details and coordinate a suitable caregiver.</p>{services.length?<RequestForm services={services}/>:<p className="surface p-6 text-sm text-[#667578]">No services are configured yet. Ask an administrator to add a service category.</p>}</main>}
