export type InterestMode = 'monthly' | 'flat' | 'zero';
export type LatePenaltyPolicy = 'per_day' | 'flat' | 'none';
export type EmiStatus = 'Active' | 'Settled' | 'Defaulted';
export type InstallmentStatus = 'Pending' | 'Paid' | 'Overdue';

export interface InstallmentScheduleItem {
  readonly number: number;
  readonly dueDate: string; // ISO 8601: YYYY-MM-DD
  readonly principalPaise: number; // Integer paise
  readonly interestPaise: number; // Integer paise
  readonly totalAmountPaise: number; // principalPaise + interestPaise
  readonly lateFeePolicyText: string;
  status: InstallmentStatus;
  paidDate: string | null;
  paidVia: string | null;
  lateFeeChargedPaise: number;
}

export interface EmiRestructuringPlan {
  readonly id: string; // Format: 'EMI-YYYY-XXXXXX'
  readonly tenantId: string;
  readonly partyId: string;
  readonly title: string;
  readonly totalPrincipalPaise: number; // Integer paise
  readonly interestType: InterestMode;
  readonly interestRatePercent: number; // Monthly percentage rate (e.g. 1.50)
  readonly totalInterestPaise: number; // Integer paise
  readonly totalPayablePaise: number; // totalPrincipalPaise + totalInterestPaise
  readonly installmentsCount: number; // 2 to 60
  readonly startDate: string; // ISO 8601: YYYY-MM-DD
  readonly lateFeeType: LatePenaltyPolicy;
  readonly lateFeePaise: number; // Integer paise
  readonly graceDays: number;
  status: EmiStatus;
  readonly installments: InstallmentScheduleItem[];
  readonly createdAt: string;
}
