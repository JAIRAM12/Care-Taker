import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect((process.env.APP_URL || "http://localhost:5173") + "/register");
}
