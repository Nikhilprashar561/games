/**
 * Standard Currency & Balance Formatter for Baazi Board
 * Enforces 2 decimal places for Paisa (e.g., 7.60, 100.00) and clamps balance to 0 minimum (never negative).
 */

export const formatCurrency = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  const rounded = Math.max(0, Math.round(Number(val) * 100) / 100);
  return rounded.toFixed(2);
};

export const formatCoins = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  const rounded = Math.max(0, Math.floor(Number(val)));
  return rounded.toLocaleString('en-IN');
};
