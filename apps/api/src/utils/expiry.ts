import { addMonths } from "./date.js";

export type ExpiryStatus = "RED" | "YELLOW" | "GREEN";

/**
 * Evrakın bitiş tarihine göre kalan-süre rengi.
 *  - null tarih  => null (süresiz)
 *  - dolmuş / <= 1 ay => RED
 *  - <= 3 ay => YELLOW
 *  - fazlası => GREEN
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

/** Bitişe kalan tam gün sayısı (negatif = geçmiş). null tarih => null. */
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

/** İnsan-okur kalan süre metni: "3 ay 12 gün", "18 gün", "45 gün önce doldu", "No expiry". */
export function remainingLabel(expiresAt: Date | string | null | undefined): string {
  const days = daysUntilExpiry(expiresAt);
  if (days === null) {
    return "No expiry";
  }
  if (days < 0) {
    return `Expired ${Math.abs(days)} days ago`;
  }
  if (days === 0) {
    return "Expires today";
  }
  if (days < 45) {
    return `${days} days left`;
  }
  const months = Math.floor(days / 30);
  const rest = days % 30;
  return rest > 0 ? `${months} mo ${rest} days left` : `${months} months left`;
}
