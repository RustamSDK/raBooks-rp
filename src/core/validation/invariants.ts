import { CanonicalTransaction } from '../models/transaction';
import { EmiRestructuringPlan } from '../models/emi-plan';

export interface InvariantValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validates a transaction against the Eight Inviolable Laws:
 * 1. Integer Paisa Precision: totalAmountPaise and split amountPaise are integers > 0.
 * 2. Bidirectional Split Reconciliation Invariant: totalAmountPaise === sum(splits.amountPaise).
 * 3. Dual-ID Decoupling: id starts with RB-TXN-, payment reference ids reside in splits only.
 */
export function validateTransactionInvariants(txn: Partial<CanonicalTransaction>): InvariantValidationResult {
  const errors: string[] = [];

  // Law 1: Integer Paisa Precision
  if (!txn.totalAmountPaise || !Number.isInteger(txn.totalAmountPaise) || txn.totalAmountPaise <= 0) {
    errors.push('Law 1 Violation: Total amount must be a positive integer in paise.');
  }

  // Check splits exist
  if (!txn.splits || txn.splits.length === 0) {
    errors.push('Transaction must contain at least one payment split rail.');
  } else {
    let allocatedSum = 0;
    txn.splits.forEach((split, idx) => {
      if (!split.amountPaise || !Number.isInteger(split.amountPaise) || split.amountPaise <= 0) {
        errors.push(`Law 1 Violation: Split allocation #${idx + 1} must be a positive integer in paise.`);
      }
      allocatedSum += split.amountPaise || 0;
    });

    // Law 2: Bidirectional Split Reconciliation Invariant (Delta === 0)
    const delta = (txn.totalAmountPaise || 0) - allocatedSum;
    if (delta !== 0) {
      errors.push(
        `Law 2 Violation: Split reconciliation discrepancy detected (Δ = ${delta} paise). Total amount must equal split sum.`
      );
    }
  }

  // Law 3: Dual-ID Decoupling
  if (txn.id && !txn.id.startsWith('RB-TXN-')) {
    errors.push("Law 3 Violation: Internal transaction ID must adhere to canonical format 'RB-TXN-XXXXXX'.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates an EMI restructuring plan.
 */
export function validateEmiPlanInvariants(plan: EmiRestructuringPlan): InvariantValidationResult {
  const errors: string[] = [];

  if (plan.installmentsCount < 2 || plan.installmentsCount > 60) {
    errors.push('Installment count must be between 2 and 60.');
  }

  let principalSum = 0;
  let interestSum = 0;
  plan.installments.forEach((inst) => {
    principalSum += inst.principalPaise;
    interestSum += inst.interestPaise;
  });

  if (principalSum !== plan.totalPrincipalPaise) {
    errors.push(
      `Law 1 Violation: Amortization schedule principal sum (${principalSum}) does not match total principal (${plan.totalPrincipalPaise}).`
    );
  }

  if (interestSum !== plan.totalInterestPaise) {
    errors.push(
      `Law 1 Violation: Amortization schedule interest sum (${interestSum}) does not match total interest (${plan.totalInterestPaise}).`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
