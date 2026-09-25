export type MovementType = 'GIVEN' | 'TAKEN';
export type PaymentRail = 'Cash' | 'UPI' | 'Bank' | 'Card' | 'Cheque' | 'Wallet' | 'Other';
export type TransactionStatus = 'Pending' | 'Confirmed' | 'Disputed' | 'Voided';
export type ActorRole = 'SuperAdmin' | 'Lender' | 'Debtor';

export type TransactionPurpose =
  | 'Loan Given'
  | 'Loan Received'
  | 'Receivable Collection'
  | 'Payable Settlement'
  | 'Sale'
  | 'Purchase'
  | 'Expense'
  | 'Income'
  | 'Advance'
  | 'Refund'
  | 'Transfer'
  | 'Adjustment'
  | 'Other';

export interface PaymentSplitAllocation {
  readonly id: string;
  readonly method: PaymentRail;
  readonly provider?: string; // Exact provider: PhonePe, SBI, Google Pay, mada, etc.
  readonly amountPaise: number; // Stored as signed 64-bit integer paise
  readonly paymentReferenceId?: string; // External Rail ID: UTR, Cheque #, Bank Ref
  readonly initiatedBy: 'Lender' | 'Debtor';
  readonly confirmed: boolean;
}

export interface CanonicalTransaction {
  readonly id: string; // Internal Bookkeeping ID: 'RB-TXN-XXXXXX'
  readonly tenantId: string;
  readonly partyId: string;
  readonly type: MovementType;
  readonly purpose?: TransactionPurpose;
  readonly provider?: string; // Main payment provider (e.g. PhonePe, SBI, Paytm)
  readonly totalAmountPaise: number; // Stored as integer paise
  readonly date: string; // ISO 8601: YYYY-MM-DD
  readonly notes: string;
  readonly status: TransactionStatus;
  readonly splits: readonly PaymentSplitAllocation[];
  readonly createdAt: string; // ISO 8601 Timestamp
  readonly createdBy: string; // User ID / Actor Identifier
}
