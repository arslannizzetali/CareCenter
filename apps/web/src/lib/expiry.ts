import type { ExpiryStatus } from "@/types";

export function expiryChipClass(status: ExpiryStatus | null | undefined): string {
  if (status === "RED") {
    return "bg-red-100 text-red-800 border-red-300";
  }
  if (status === "YELLOW") {
    return "bg-yellow-100 text-yellow-800 border-yellow-300";
  }
  if (status === "GREEN") {
    return "bg-green-100 text-green-800 border-green-300";
  }
  return "bg-surface text-muted border-border";
}

export function expiryDotClass(status: ExpiryStatus | null | undefined): string {
  if (status === "RED") {
    return "bg-red-500";
  }
  if (status === "YELLOW") {
    return "bg-yellow-500";
  }
  if (status === "GREEN") {
    return "bg-green-500";
  }
  return "bg-gray-300";
}
