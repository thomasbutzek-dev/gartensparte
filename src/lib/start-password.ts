export const WELL_KNOWN_START_PASSWORD = "gartensparte-start";
export const WELL_KNOWN_DEMO_PASSWORD = "gartensparte-demo";

export function demoEnabled(): boolean {
  const flag = process.env.ENABLE_DEMO?.trim().toLowerCase();
  if (flag === "0" || flag === "false") return false;
  if (flag === "1" || flag === "true") return true;
  return process.env.NODE_ENV !== "production";
}

export function configuredStartPassword(): string {
  return process.env.ADMIN_START_PASSWORD?.trim() || WELL_KNOWN_START_PASSWORD;
}

export function configuredDemoPassword(): string {
  return process.env.DEMO_START_PASSWORD?.trim() || WELL_KNOWN_DEMO_PASSWORD;
}

export function isStartPassword(password: string): boolean {
  if (!password) return false;
  if (password === WELL_KNOWN_START_PASSWORD) return true;
  const configured = process.env.ADMIN_START_PASSWORD?.trim();
  return Boolean(configured) && password === configured;
}
