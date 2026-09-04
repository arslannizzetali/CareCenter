export function omitUndefined<T extends Record<string, unknown>>(value: T): {
  [K in keyof T]?: Exclude<T[K], undefined>;
} {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);
  return Object.fromEntries(entries) as { [K in keyof T]?: Exclude<T[K], undefined> };
}

export function toJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}
