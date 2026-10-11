import { z } from "zod";
import { INDIA_STATES } from "./india";

export const accountDetailsSchema = z.object({
  addressLine: z.string().trim().min(8).max(180)
    .regex(/[\p{L}]/u, "Enter a street or locality name.")
    .regex(/^[\p{L}\p{M}\p{N}\s,./#()'&-]+$/u, "Use letters and numbers for the street address."),
  city: z.string().trim().min(2).max(80)
    .regex(/^[\p{L}\p{M} .'-]+$/u, "Enter a valid city or town name."),
  state: z.enum(INDIA_STATES),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a six-digit Indian PIN code."),
  industry: z.string().trim().min(2).max(100)
    .regex(/[\p{L}]/u, "Enter the industry or field where you work."),
});

export type AccountDetails = z.infer<typeof accountDetailsSchema>;

export function formatIndiaAddress(details: AccountDetails) {
  return `${details.addressLine}, ${details.city}, ${details.state} ${details.pincode}, India`;
}

export function hasCompleteAccountDetails(user: {
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  industry: string | null;
}) {
  return Boolean(user.addressLine?.trim() && user.city?.trim() && user.state?.trim()
    && user.pincode?.trim() && user.industry?.trim());
}
