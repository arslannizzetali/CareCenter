import { addMonths } from "./date.js";

export type ExpiryStatus = "RED" | "YELLOW" | "GREEN";

/**
 * Remaining-time color based on a document's expiry date.
 *  - null date   => null (no expiry)
 *  - expired / <= 1 month => RED
 *  - <= 3 ay => YELLOW
 *  - more => GREEN
 */
export function expiryStatus(expiresAt: Date | string | null | undefined): ExpiryStatus | null {
  if (!expiresAt) {
    return null;
  }
  const expires = new Date(expiresAt);
  const now = new Date();
  if (expires <= addMonths(now, 1)) {
    return "RED";
  }
  if (expires <= addMonths(now, 3)) {
    return "YELLOW";
  }
  return "GREEN";
}

/** Whole days left until expiry (negative = past). null date => null. */
export function daysUntilExpiry(expiresAt: Date | string | null | undefined): number | null {
  if (!expiresAt) {
    return null;
  }
  const expires = new Date(expiresAt);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfExpiry = new Date(expires);
  startOfExpiry.setHours(0, 0, 0, 0);
  return Math.round((startOfExpiry.getTime() - startOfToday.getTime()) / 86_400_000);
}

/** Human-readable remaining time: "3 months 12 days", "18 days", "expired 45 days ago", "No expiry". */
export function remainingLabel(expiresAt: Date | string | null | undefined): string {
  const days = daysUntilExpiry(expiresAt);
  if (days === null) {
    return "No expiry";
  }
  if (days < 0) {
    return `expired ${Math.abs(days)} days ago`;
  }
  if (days === 0) {
    return "Expires today";
  }
  if (days < 45) {
    return `${days} days left`;
  }
  const months = Math.floor(days / 30);
  const rest = days % 30;
  return rest > 0 ? `${months} months ${rest} days left` : `${months} months left`;
}
