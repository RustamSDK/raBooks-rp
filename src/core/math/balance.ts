import { CanonicalTransaction } from '../models/transaction';

export interface BalanceBreakdown {
  readonly totalDisbursedPaise: number;
  readonly totalCollectedPaise: number;
  readonly netBalancePaise: number;
}

/**
 * Calculates running financial balances chronologically.
 * Invariant: Net balance strictly equals sum(GIVEN) - sum(TAKEN).
 */
export function calculatePartyNetBalance(transactions: readonly CanonicalTransaction[]): BalanceBreakdown {
  let totalDisbursedPaise = 0;
  let totalCollectedPaise = 0;

  for (let i = 0; i < transactions.length; i++) {
    const txn = transactions[i];
    if (txn.status !== 'Confirmed') {
      continue;
    }

    if (txn.type === 'GIVEN') {
      totalDisbursedPaise += txn.totalAmountPaise;
    } else if (txn.type === 'TAKEN') {
      totalCollectedPaise += txn.totalAmountPaise;
    }
  }

  return {
    totalDisbursedPaise,
    totalCollectedPaise,
    netBalancePaise: totalDisbursedPaise - totalCollectedPaise,
  };
}

/**
 * Enforces the Bidirectional Split Allocation Invariant (Law 2: Delta === 0).
 * Total declared amount must reconcile with the sum of individual split rows to zero delta.
 */
export function validateSplitAllocations(
  totalAmountPaise: number,
  splits: readonly { amountPaise: number }[]
): { readonly isValid: boolean; readonly deltaPaise: number } {
  let allocatedSum = 0;
  for (let i = 0; i < splits.length; i++) {
    allocatedSum += Number(splits[i].amountPaise || 0);
  }

  const deltaPaise = totalAmountPaise - allocatedSum;
  return {
    isValid: deltaPaise === 0,
    deltaPaise,
  };
}
