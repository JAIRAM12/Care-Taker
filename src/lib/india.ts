export const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
  "Lakshadweep", "Puducherry",
] as const;

function compactPhone(value: string) {
  return value.trim().replace(/[\s().-]/g, "");
}

export function normalizeIndianPhone(value: string) {
  const compact = compactPhone(value);
  const national = compact.startsWith("+91") ? compact.slice(3) : compact;
  return /^[6-9]\d{9}$/.test(national) ? `+91${national}` : null;
}

export function normalizePhone(value: string) {
  const compact = compactPhone(value);
  return normalizeIndianPhone(compact) ?? (/^\+[1-9]\d{7,14}$/.test(compact) ? compact : null);
}
