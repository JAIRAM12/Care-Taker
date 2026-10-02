import { redirect } from "next/navigation";

export default function ForgotPasswordPage() {
  redirect((process.env.APP_URL || "http://localhost:5173") + "/forgot-password");
}
