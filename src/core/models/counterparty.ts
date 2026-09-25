export type PartyRelation =
  | 'Customer'
  | 'Supplier'
  | 'Borrower'
  | 'Lender'
  | 'Partner'
  | 'Employee'
  | 'Other';

export type TrustScore = 'green' | 'amber' | 'red';

export interface CounterpartyEntity {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly phone: string;
  readonly email?: string;
  readonly upiId?: string;
  readonly address?: string;
  readonly photoUrl?: string;
  readonly notes?: string;
  readonly openingBalancePaise?: number;
  readonly openingBalanceType?: 'Receivable' | 'Payable';
  readonly relation: PartyRelation;
  readonly ratePercentMonthly: number;
  readonly trustScore: TrustScore;
  readonly overdue: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
