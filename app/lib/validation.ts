const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Coerces untrusted JSON input to a trimmed, length-capped string.
export function cleanText(value: unknown, maxLength = 200): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim().slice(0, maxLength)
    : "";
}

export function cleanEmail(value: unknown): string {
  const email = cleanText(value, 254).toLowerCase();
  return EMAIL_RE.test(email) ? email : "";
}
