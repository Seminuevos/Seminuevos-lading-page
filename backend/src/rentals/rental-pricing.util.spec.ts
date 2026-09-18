import { calculateRentalTotal } from './rental-pricing.util';

describe('calculateRentalTotal', () => {
  it('usa el precio por defecto cuando no hay reglas', () => {
    const result = calculateRentalTotal('2026-10-01', '2026-10-04', 50, []);
    expect(result.totalDays).toBe(3);
    expect(result.totalPrice).toBe(150);
  });

  it('lanza error si end_date no es posterior a start_date', () => {
    expect(() => calculateRentalTotal('2026-10-04', '2026-10-04', 50, [])).toThrow();
    expect(() => calculateRentalTotal('2026-10-05', '2026-10-04', 50, [])).toThrow();
  });

  it('aplica una regla de temporada que cubre todo el rango', () => {
    const result = calculateRentalTotal('2026-12-20', '2026-12-23', 50, [
      { start_date: '2026-12-15', end_date: '2027-01-05', price_per_day: 100 },
    ]);
    expect(result.totalDays).toBe(3);
    expect(result.totalPrice).toBe(300);
  });

  it('mezcla precio default y de regla cuando el rango cruza la temporada', () => {
    // 2026-12-30 y 2026-12-31 a $100 (regla), 2027-01-01 a $50 (default)
    const result = calculateRentalTotal('2026-12-30', '2027-01-02', 50, [
      { start_date: '2026-12-15', end_date: '2026-12-31', price_per_day: 100 },
    ]);
    expect(result.totalDays).toBe(3);
    expect(result.totalPrice).toBe(250);
  });

  it('redondea a 2 decimales', () => {
    const result = calculateRentalTotal('2026-10-01', '2026-10-04', 33.333, []);
    expect(result.totalPrice).toBe(100);
  });
});
