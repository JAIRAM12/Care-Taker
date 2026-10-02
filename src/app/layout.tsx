import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "CareConnect | Trusted care, managed simply", description: "Coordinate care requests, caregiver assignments, schedules and service updates in one place." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
