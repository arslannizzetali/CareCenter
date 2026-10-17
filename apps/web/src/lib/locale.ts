import { format, formatDistanceToNowStrict } from "date-fns";
import { enGB } from "date-fns/locale";

export function formatDateTime(value: string | Date): string {
  return format(new Date(value), "d MMMM yyyy, HH:mm", { locale: enGB });
}

export function formatDate(value: string | Date): string {
  return format(new Date(value), "d MMMM yyyy", { locale: enGB });
}

export function fromNow(value: string | Date): string {
  return `${formatDistanceToNowStrict(new Date(value), { locale: enGB })} ago`;
}
