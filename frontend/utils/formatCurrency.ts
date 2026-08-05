/**
 * Standard Currency & Balance Formatter for Baazi Board
 * Formats numbers in Indian Rupee format (e.g. 7.60, 1,000.00) without exponential notation (e.g. 5e+107).
 */

export const formatCurrency = (val?: number | string | null): string => {
  if (val === undefined || val === null) return '0.00';
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(num) || !isFinite(num)) return '0.00';

  // Cap unrealistically large numbers to prevent 5e+107 exponential string corruption
  if (num > 10000000) {
    return '1,00,000.00';
  }

  const rounded = Math.max(0, Math.round(num * 100) / 100);
  return rounded.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatCoins = (val?: number | string | null): string => {
  if (val === undefined || val === null) return '0';
  const num = typeof val === 'string' ? parseInt(val, 10) : Math.floor(Number(val));
  if (isNaN(num) || !isFinite(num)) return '0';

  if (num > 10000000) {
    return '10,000,000';
  }

  const rounded = Math.max(0, num);
  return rounded.toLocaleString('en-IN');
};
