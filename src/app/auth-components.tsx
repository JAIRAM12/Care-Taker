import Link from "next/link";
import type { ReactNode } from "react";
export function AuthShell({title,subtitle,children}:{title:string,subtitle:string,children:ReactNode}){return <main className="grid min-h-screen place-items-center px-5 py-10"><section className="surface w-full max-w-md p-7 sm:p-9"><Link href="/" className="font-semibold text-[#246b50]">CareConnect</Link><h1 className="mt-8 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 mb-7 text-sm text-[#667578]">{subtitle}</p>{children}</section></main>}
export function Field({label,children}:{label:string,children:ReactNode}){return <label className="block text-sm font-medium">{label}{children}</label>}
