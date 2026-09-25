/**
 * Formats signed integer paise into Indian Rupee currency string (INR).
 * Example: 1250050 paise => "₹12,500.50"
 * Uses Indian numbering format: 1,23,45,678.90
 */
export function formatPaiseToInr(paise: number, includeSymbol = true): string {
  if (isNaN(paise) || !isFinite(paise)) {
    return includeSymbol ? '₹0.00' : '0.00';
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupees = Math.floor(absPaise / 100);
  const remainingPaise = absPaise % 100;

  // Format integer part with Indian grouping (last 3 digits, then 2 digits)
  const rupeesStr = rupees.toString();
  let formattedRupees = '';

  if (rupeesStr.length <= 3) {
    formattedRupees = rupeesStr;
  } else {
    const lastThree = rupeesStr.substring(rupeesStr.length - 3);
    const remaining = rupeesStr.substring(0, rupeesStr.length - 3);
    const groups = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedRupees = `${groups},${lastThree}`;
  }

  const paiseStr = remainingPaise.toString().padStart(2, '0');
  const result = `${isNegative ? '-' : ''}${formattedRupees}.${paiseStr}`;

  return includeSymbol ? `₹${result}` : result;
}

/**
 * Parses user input string (e.g., "12,500.75" or "5000") into exact signed integer paise.
 * Avoids IEEE-754 floating point multiplication errors by processing whole & decimal components separately.
 */
export function parseRupeesToPaise(input: string | number): number {
  if (typeof input === 'number') {
    return Math.round(input * 100);
  }

  if (!input || typeof input !== 'string') {
    return 0;
  }

  const cleaned = input.replace(/[^0-9.-]/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '.') {
    return 0;
  }

  const isNegative = cleaned.startsWith('-');
  const unsigned = isNegative ? cleaned.slice(1) : cleaned;

  const parts = unsigned.split('.');
  const wholePart = parts[0] ? parseInt(parts[0], 10) : 0;

  let fractionalPart = 0;
  if (parts.length > 1 && parts[1]) {
    const decimalDigits = parts[1].slice(0, 2).padEnd(2, '0');
    fractionalPart = parseInt(decimalDigits, 10);
  }

  const totalPaise = wholePart * 100 + fractionalPart;
  return isNegative ? -totalPaise : totalPaise;
}

/**
 * Compact Indian format for high-density badges/KPIs.
 * E.g., ₹1.50 L, ₹2.40 Cr, ₹45.00 K
 */
export function formatCompactPaise(paise: number): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = absPaise / 100;

  let formatted = '';
  if (rupees >= 10000000) {
    formatted = `${(rupees / 10000000).toFixed(2)} Cr`;
  } else if (rupees >= 100000) {
    formatted = `${(rupees / 100000).toFixed(2)} L`;
  } else if (rupees >= 1000) {
    formatted = `${(rupees / 1000).toFixed(1)} K`;
  } else {
    formatted = rupees.toFixed(2);
  }

  return `${isNegative ? '-' : ''}₹${formatted}`;
}
