import { InstallmentScheduleItem, InterestMode, LatePenaltyPolicy } from '../models/emi-plan';

export interface AmortizationPlanInput {
  readonly principalPaise: number; // Stored as integer paise
  readonly tenureMonths: number;
  readonly startDate: string; // ISO 8601: YYYY-MM-DD
  readonly interestMode: InterestMode;
  readonly interestValue: number; // Monthly rate % or flat amount in paise
  readonly lateFeeType: LatePenaltyPolicy;
  readonly lateFeePaise: number;
  readonly graceDays: number;
}

export interface AmortizationScheduleOutput {
  readonly totalInterestPaise: number;
  readonly totalPayablePaise: number;
  readonly schedule: InstallmentScheduleItem[];
}

/**
 * Generates an amortization schedule with exact integer remainder absorption.
 * Guarantees sum(principal) === principalPaise and sum(interest) === totalInterestPaise.
 * Formula for terminal absorption:
 * Remainder_Terminal = Total Amount - sum(k=1 to n-1 of Allocated_k)
 */
export function generateDeterministicAmortization(input: AmortizationPlanInput): AmortizationScheduleOutput {
  const {
    principalPaise,
    tenureMonths,
    startDate,
    interestMode,
    interestValue,
    lateFeeType,
    lateFeePaise,
    graceDays,
  } = input;

  if (tenureMonths <= 0 || !Number.isInteger(tenureMonths)) {
    throw new Error('ERR_INVALID_TENURE: Tenure must be a positive integer.');
  }
  if (principalPaise <= 0 || !Number.isInteger(principalPaise)) {
    throw new Error('ERR_INVALID_PRINCIPAL: Principal must be a positive integer in paise.');
  }

  let calculatedInterestPaise = 0;
  if (interestMode === 'monthly') {
    // Uncompounded simple interest across tenure: Principal * (Rate/100) * Months
    calculatedInterestPaise = Math.round(principalPaise * (interestValue / 100) * tenureMonths);
  } else if (interestMode === 'flat') {
    calculatedInterestPaise = Math.round(interestValue);
  } else {
    calculatedInterestPaise = 0;
  }

  const basePrincipalPaise = Math.floor(principalPaise / tenureMonths);
  const baseInterestPaise = Math.floor(calculatedInterestPaise / tenureMonths);

  const schedule: InstallmentScheduleItem[] = [];
  const baseDate = new Date(startDate);

  for (let i = 1; i <= tenureMonths; i++) {
    const isTerminal = i === tenureMonths;

    // Terminal installment absorbs integer remainders
    const principalComponent = isTerminal
      ? principalPaise - basePrincipalPaise * (tenureMonths - 1)
      : basePrincipalPaise;

    const interestComponent = isTerminal
      ? calculatedInterestPaise - baseInterestPaise * (tenureMonths - 1)
      : baseInterestPaise;

    const installmentDueDate = new Date(baseDate);
    installmentDueDate.setMonth(installmentDueDate.getMonth() + (i - 1));

    const policyText = lateFeeType === 'none'
      ? 'No late penalty applies'
      : `₹${(lateFeePaise / 100).toFixed(2)} ${lateFeeType === 'per_day' ? '/day' : 'flat'} after ${graceDays}d grace`;

    schedule.push({
      number: i,
      dueDate: installmentDueDate.toISOString().split('T')[0],
      principalPaise: principalComponent,
      interestPaise: interestComponent,
      totalAmountPaise: principalComponent + interestComponent,
      lateFeePolicyText: policyText,
      status: 'Pending',
      paidDate: null,
      paidVia: null,
      lateFeeChargedPaise: 0,
    });
  }

  return {
    totalInterestPaise: calculatedInterestPaise,
    totalPayablePaise: principalPaise + calculatedInterestPaise,
    schedule,
  };
}
