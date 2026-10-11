export type Role = "CUSTOMER" | "MAID" | "MAID_MANAGER" | "ADMIN" | string;
export type SessionUser = { id: string; name: string; email: string; role: Role; profileComplete: boolean };

export async function api<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : "The request could not be completed.";
    throw new Error(message);
  }
  return data as T;
}

export const post = <T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> => api<T>(path, {
  method: "POST",
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export function dashboardPath(role: Role) {
  if (role === "CUSTOMER") return "/customer/dashboard";
  if (role === "MAID") return "/maid/dashboard";
  if (role === "MAID_MANAGER") return "/manager/dashboard";
  return "/admin/dashboard";
}
