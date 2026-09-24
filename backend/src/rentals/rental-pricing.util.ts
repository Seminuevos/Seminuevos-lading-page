export interface RentalPriceRule {
  start_date: string; // 'YYYY-MM-DD'
  end_date: string;
  price_per_day: number;
}

function toUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Calcula el precio total de un alquiler día por día: cada día pedido usa la
 * regla de rental_price_rules vigente ese día (la primera que matchee), o
 * defaultPricePerDay si ninguna regla cubre esa fecha. `startDate` inclusivo,
 * `endDate` exclusivo (número de noches = diferencia en días).
 */
export function calculateRentalTotal(
  startDate: string,
  endDate: string,
  defaultPricePerDay: number,
  rules: RentalPriceRule[],
): { totalDays: number; totalPrice: number } {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);

  if (totalDays < 1) {
    throw new Error('end_date debe ser posterior a start_date');
  }

  let totalPrice = 0;
  for (let i = 0; i < totalDays; i++) {
    const day = isoDate(addDays(start, i));
    const matchingRule = rules.find((rule) => rule.start_date <= day && day <= rule.end_date);
    totalPrice += matchingRule ? Number(matchingRule.price_per_day) : Number(defaultPricePerDay);
  }

  return { totalDays, totalPrice: Math.round(totalPrice * 100) / 100 };
}
