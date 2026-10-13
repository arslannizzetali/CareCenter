import { format, formatDistanceToNowStrict } from "date-fns";
import { enUS } from "date-fns/locale";

export function formatDateTime(value: string | Date): string {
  return format(new Date(value), "d MMMM yyyy, HH:mm", { locale: enUS });
}

export function formatDate(value: string | Date): string {
  return format(new Date(value), "d MMMM yyyy", { locale: enUS });
}

export function fromNow(value: string | Date): string {
  return `${formatDistanceToNowStrict(new Date(value), { locale: enUS })} ago`;
}
