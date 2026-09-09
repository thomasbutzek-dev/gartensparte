export const roles = ["admin", "vorstand", "kassenwart", "demo"] as const;
export type Role = (typeof roles)[number];

export function isDemoRole(role: Role): boolean {
  return role === "demo";
}

export function canWriteRole(role: Role): boolean {
  return role !== "demo";
}

export function canManageMoneyRole(role: Role): boolean {
  return role === "admin" || role === "kassenwart";
}

export function canSeeMoneyRole(role: Role): boolean {
  return canManageMoneyRole(role) || isDemoRole(role);
}

export function canAdministerRole(role: Role): boolean {
  return role === "admin";
}

/** Bank, Beiträge, Impressum anschauen. Demo darf mitlesen, Konten nicht. */
export function canSeeSettingsRole(role: Role): boolean {
  return canAdministerRole(role) || isDemoRole(role);
}
