export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function requireString(value: unknown, field: string, maxLen = 1000): string {
  if (typeof value !== "string" || !value.trim()) throw new ValidationError(`${field} is required`);
  if (value.length > maxLen) throw new ValidationError(`${field} exceeds ${maxLen} characters`);
  return value.trim();
}

export function requireSlug(value: unknown, field = "slug"): string {
  const s = requireString(value, field, 100);
  if (!/^[a-z0-9-]+$/.test(s)) throw new ValidationError(`${field} must contain only lowercase letters, numbers, and hyphens`);
  return s;
}

export function optionalString(value: unknown, maxLen = 5000): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value !== "string") throw new ValidationError("Expected string");
  if (value.length > maxLen) throw new ValidationError(`Value exceeds ${maxLen} characters`);
  return value.trim();
}

export function requireEmail(value: unknown): string {
  const s = requireString(value, "email", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new ValidationError("Invalid email address");
  return s.toLowerCase();
}

export function requirePositiveInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new ValidationError(`${field} must be a positive integer`);
  return n;
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}
