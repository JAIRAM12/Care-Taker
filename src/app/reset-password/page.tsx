import { redirect } from "next/navigation";

export default function ResetPasswordPage() {
  redirect((process.env.APP_URL || "http://localhost:5173") + "/reset-password");
}
