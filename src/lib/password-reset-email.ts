export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("EMAIL_API_KEY and EMAIL_FROM must be configured in production.");
    }
    console.info(`[CareConnect] Development password reset link: ${resetUrl}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Reset your CareConnect password",
      text: `We received a request to reset your CareConnect password. This link expires in 30 minutes.\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>We received a request to reset your CareConnect password.</p><p>This link expires in 30 minutes.</p><p><a href="${resetUrl}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Password reset email provider returned HTTP ${response.status}.`);
  }
}
