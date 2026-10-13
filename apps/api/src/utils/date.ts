export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  result.setMonth(targetMonth);
  // On month overflow (e.g. Jan 31 + 1 month), clamp to the last day of the month
  if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    result.setDate(0);
  }
  return result;
}

/** The date `years` years before today — used to compute an age threshold. */
export function yearsAgo(years: number): Date {
  const result = new Date();
  result.setFullYear(result.getFullYear() - years);
  return result;
}
