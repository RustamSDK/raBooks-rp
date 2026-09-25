/**
 * Calculates accrued simple interest (uncapitalized yield) on positive balances.
 * Yield = floor(Principal * (Rate / 100) * (Delta Days / 30))
 */
export function calculateAccruedSimpleYield(
  principalPaise: number,
  monthlyRatePercent: number,
  daysElapsed: number
): number {
  if (principalPaise <= 0 || monthlyRatePercent <= 0 || daysElapsed <= 0) {
    return 0;
  }

  const factor = (monthlyRatePercent / 100) * (daysElapsed / 30);
  return Math.floor(principalPaise * factor);
}
