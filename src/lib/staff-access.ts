import {createHmac} from "node:crypto";

export const staffRoles = [
  "reviewer",
  "finance",
  "program_admin",
  "super_admin",
] as const;

export type StaffRole = (typeof staffRoles)[number];

export function normalizeStaffEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function isActiveStaffRole(
  role: string | null | undefined,
  active: boolean | null | undefined,
) {
  return active === true && staffRoles.includes(role as StaffRole);
}

export function safeStaffDestination(value: unknown) {
  const requested = String(value ?? "").trim();
  return requested === "/admin" || requested.startsWith("/admin/")
    ? requested
    : "/admin";
}

export function staffAccessHash(value: string, secret: string) {
  if (secret.length < 32) {
    throw new Error("STAFF_LOGIN_AUDIT_SECRET must contain at least 32 characters.");
  }
  return createHmac("sha256", secret).update(value).digest("hex");
}
