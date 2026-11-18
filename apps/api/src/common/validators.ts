/** Strict input validation (S70). No new runtime dependencies. */
import { BadRequestException } from "@nestjs/common";

export function requireString(value: unknown, name: string, maxLength = 200): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestException(name + " must be a non-empty string");
  }
  if (value.length > maxLength) {
    throw new BadRequestException(name + " exceeds " + String(maxLength) + " characters");
  }
  return value.trim();
}

export function requireCents(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new BadRequestException(name + " must be a positive integer amount in minor units (never floating point)");
  }
  return value;
}

export function requireEnum(value: unknown, name: string, allowed: readonly string[]): string {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new BadRequestException(name + " must be one of: " + allowed.join(", "));
  }
  return value;
}