import { format, formatDistanceToNowStrict } from "date-fns";
import { tr } from "date-fns/locale";

export function formatDateTime(value: string | Date): string {
  return format(new Date(value), "d MMMM yyyy, HH:mm", { locale: tr });
}

export function fromNow(value: string | Date): string {
  return `${formatDistanceToNowStrict(new Date(value), { locale: tr })} önce`;
}
