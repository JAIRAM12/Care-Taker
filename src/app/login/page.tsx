import { redirect } from "next/navigation";

export default function LoginPage() {
  redirect((process.env.APP_URL || "http://localhost:5173") + "/login");
}
