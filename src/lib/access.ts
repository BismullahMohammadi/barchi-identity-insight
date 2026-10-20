// Owner allowlist. Default deny: an empty/missing list allows nobody.
export function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export function isEmailAllowed(email: string | null | undefined, raw: string | undefined | null): boolean {
  if (!email) return false;
  const list = parseAllowlist(raw);
  return list.includes(email.trim().toLowerCase());
}
