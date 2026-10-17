export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  result.setMonth(targetMonth);
  // Ay taşması (örn. 31 Ocak + 1 ay) durumunda ayın son gününe sabitle
  if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    result.setDate(0);
  }
  return result;
}

/** Bugünden `years` yıl önceki tarih — yaş eşiği hesaplamak için. */
export function yearsAgo(years: number): Date {
  const result = new Date();
  result.setFullYear(result.getFullYear() - years);
  return result;
}
