import { CounterpartyEntity } from '../core/models/counterparty';
import { CanonicalTransaction } from '../core/models/transaction';
import { EmiRestructuringPlan } from '../core/models/emi-plan';
import { SecurityAuditRecord } from '../core/models/audit-log';
import { generateDeterministicAmortization } from '../core/math/amortization';

export const DEFAULT_TENANT_ID = 'RB-TENANT-IN-01';

export const INITIAL_COUNTERPARTIES: CounterpartyEntity[] = [
  {
    id: 'pty-reliance-petro',
    tenantId: DEFAULT_TENANT_ID,
    name: 'Reliance Petrochem Distributors',
    phone: '+91 98201 44892',
    email: 'accounts@reliancepetrochem.co.in',
    upiId: 'reliancepetro@icici',
    relation: 'Supplier',
    ratePercentMonthly: 1.25,
    trustScore: 'green',
    overdue: false,
    createdAt: '2026-08-01T09:00:00Z',
    updatedAt: '2026-09-15T11:30:00Z',
  },
  {
    id: 'pty-sharma-steel',
    tenantId: DEFAULT_TENANT_ID,
    name: 'Sharma Steel Works & Fabricators',
    phone: '+91 98450 19283',
    email: 'finance@sharmasteel.in',
    upiId: 'sharmasteel@hdfcbank',
    relation: 'Borrower',
    ratePercentMonthly: 2.00,
    trustScore: 'amber',
    overdue: true,
    createdAt: '2026-07-15T10:15:00Z',
    updatedAt: '2026-09-20T14:45:00Z',
  },
  {
    id: 'pty-apex-logistics',
    tenantId: DEFAULT_TENANT_ID,
    name: 'Apex Logistics Private Limited',
    phone: '+91 97112 88471',
    email: 'billing@apexlogistics.com',
    upiId: 'apexlogistics@sbi',
    relation: 'Partner',
    ratePercentMonthly: 1.50,
    trustScore: 'green',
    overdue: false,
    createdAt: '2026-08-10T12:00:00Z',
    updatedAt: '2026-09-22T16:00:00Z',
  },
  {
    id: 'pty-mehta-textiles',
    tenantId: DEFAULT_TENANT_ID,
    name: 'Mehta Textiles Syndicate',
    phone: '+91 99304 55120',
    email: 'mehta.textiles@rediffmail.com',
    upiId: 'mehtatex@axisbank',
    relation: 'Customer',
    ratePercentMonthly: 1.00,
    trustScore: 'green',
    overdue: false,
    createdAt: '2026-08-20T08:30:00Z',
    updatedAt: '2026-09-18T10:00:00Z',
  },
  {
    id: 'pty-gupta-traders',
    tenantId: DEFAULT_TENANT_ID,
    name: 'Gupta Traders & Sons',
    phone: '+91 94150 99312',
    email: 'guptatraders.kanpur@gmail.com',
    upiId: 'guptatraders@kotak',
    relation: 'Customer',
    ratePercentMonthly: 1.75,
    trustScore: 'red',
    overdue: true,
    createdAt: '2026-06-01T11:00:00Z',
    updatedAt: '2026-09-21T18:20:00Z',
  },
];

export const INITIAL_TRANSACTIONS: CanonicalTransaction[] = [
  {
    id: 'RB-TXN-001001',
    tenantId: DEFAULT_TENANT_ID,
    partyId: 'pty-reliance-petro',
    type: 'TAKEN',
    purpose: 'Advance',
    provider: 'icici',
    totalAmountPaise: 45000000, // ₹4,50,000.00
    date: '2026-08-05',
    notes: 'Advance raw material inventory shipment - Batch PETRO-991',
    status: 'Confirmed',
    splits: [
      {
        id: 'spl-001a',
        method: 'Bank',
        provider: 'icici',
        amountPaise: 35000000, // ₹3,50,000.00
        paymentReferenceId: 'NEFT-RB260805192841',
        initiatedBy: 'Debtor',
        confirmed: true,
      },
      {
        id: 'spl-001b',
        method: 'Cheque',
        provider: 'cheque',
        amountPaise: 10000000, // ₹1,00,000.00
        paymentReferenceId: 'CHQ-CTS2010-449102',
        initiatedBy: 'Debtor',
        confirmed: true,
      },
    ],
    createdAt: '2026-08-05T10:00:00Z',
    createdBy: 'RB-AUDIT-SYS',
  },
  {
    id: 'RB-TXN-001002',
    tenantId: DEFAULT_TENANT_ID,
    partyId: 'pty-reliance-petro',
    type: 'GIVEN',
    purpose: 'Payable Settlement',
    provider: 'hdfc',
    totalAmountPaise: 20000000, // ₹2,00,000.00
    date: '2026-08-25',
    notes: 'Partial settlement for bulk crude supply delivery voucher #492',
    status: 'Confirmed',
    splits: [
      {
        id: 'spl-002a',
        method: 'Bank',
        provider: 'hdfc',
        amountPaise: 20000000,
        paymentReferenceId: 'RTGS-HDFC2608259102',
        initiatedBy: 'Lender',
        confirmed: true,
      },
    ],
    createdAt: '2026-08-25T14:30:00Z',
    createdBy: 'RB-AUDIT-SYS',
  },
  {
    id: 'RB-TXN-001003',
    tenantId: DEFAULT_TENANT_ID,
    partyId: 'pty-sharma-steel',
    type: 'GIVEN',
    purpose: 'Loan Given',
    provider: 'phonepe',
    totalAmountPaise: 35000000, // ₹3,50,000.00
    date: '2026-08-12',
    notes: 'Capital disbursement for CNC lathe machinery procurement',
    status: 'Confirmed',
    splits: [
      {
        id: 'spl-003a',
        method: 'UPI',
        provider: 'phonepe',
        amountPaise: 20000000,
        paymentReferenceId: 'UPI-ICICI-624910283719',
        initiatedBy: 'Lender',
        confirmed: true,
      },
      {
        id: 'spl-003b',
        method: 'Cash',
        provider: 'cash',
        amountPaise: 15000000,
        paymentReferenceId: 'VCHR-CASH-DELHI-881',
        initiatedBy: 'Lender',
        confirmed: true,
      },
    ],
    createdAt: '2026-08-12T11:15:00Z',
    createdBy: 'RB-AUDIT-SYS',
  },
  {
    id: 'RB-TXN-001004',
    tenantId: DEFAULT_TENANT_ID,
    partyId: 'pty-sharma-steel',
    type: 'TAKEN',
    purpose: 'Receivable Collection',
    provider: 'gpay',
    totalAmountPaise: 10000000, // ₹1,00,000.00
    date: '2026-09-02',
    notes: 'Tranche 1 repayment received via instant clearing rail',
    status: 'Confirmed',
    splits: [
      {
        id: 'spl-004a',
        method: 'UPI',
        provider: 'gpay',
        amountPaise: 10000000,
        paymentReferenceId: 'UPI-HDFC-991028472911',
        initiatedBy: 'Debtor',
        confirmed: true,
      },
    ],
    createdAt: '2026-09-02T16:45:00Z',
    createdBy: 'RB-AUDIT-SYS',
  },
  {
    id: 'RB-TXN-001005',
    tenantId: DEFAULT_TENANT_ID,
    partyId: 'pty-mehta-textiles',
    type: 'GIVEN',
    purpose: 'Sale',
    provider: 'axis',
    totalAmountPaise: 18500000, // ₹1,85,000.00
    date: '2026-08-28',
    notes: 'Consignment invoice #TEX-8821 cotton yarn export credit',
    status: 'Confirmed',
    splits: [
      {
        id: 'spl-005a',
        method: 'Bank',
        provider: 'axis',
        amountPaise: 18500000,
        paymentReferenceId: 'NEFT-AXIS-26082877192',
        initiatedBy: 'Lender',
        confirmed: true,
      },
    ],
    createdAt: '2026-08-28T09:20:00Z',
    createdBy: 'RB-AUDIT-SYS',
  },
  {
    id: 'RB-TXN-001006',
    tenantId: DEFAULT_TENANT_ID,
    partyId: 'pty-gupta-traders',
    type: 'GIVEN',
    purpose: 'Loan Given',
    provider: 'kotak',
    totalAmountPaise: 27500000, // ₹2,75,000.00
    date: '2026-07-20',
    notes: 'Credit extended for hardware fittings seasonal stock',
    status: 'Confirmed',
    splits: [
      {
        id: 'spl-006a',
        method: 'Bank',
        provider: 'kotak',
        amountPaise: 25000000,
        paymentReferenceId: 'RTGS-KOTAK-2607204491',
        initiatedBy: 'Lender',
        confirmed: true,
      },
      {
        id: 'spl-006b',
        method: 'Cash',
        provider: 'cash',
        amountPaise: 2500000,
        paymentReferenceId: 'VCHR-KANPUR-401',
        initiatedBy: 'Lender',
        confirmed: true,
      },
    ],
    createdAt: '2026-07-20T14:10:00Z',
    createdBy: 'RB-AUDIT-SYS',
  },
  {
    id: 'RB-TXN-001007',
    tenantId: DEFAULT_TENANT_ID,
    partyId: 'pty-apex-logistics',
    type: 'GIVEN',
    purpose: 'Expense',
    provider: 'sbi',
    totalAmountPaise: 12000000, // ₹1,20,000.00
    date: '2026-09-10',
    notes: 'Fleet container transit toll & fuel corridor disbursement',
    status: 'Confirmed',
    splits: [
      {
        id: 'spl-007a',
        method: 'UPI',
        provider: 'sbi',
        amountPaise: 12000000,
        paymentReferenceId: 'UPI-SBI-88192049182',
        initiatedBy: 'Lender',
        confirmed: true,
      },
    ],
    createdAt: '2026-09-10T08:50:00Z',
    createdBy: 'RB-AUDIT-SYS',
  },
];

// Pre-generate deterministic EMI plan for Sharma Steel Works
const sharmaAmortization = generateDeterministicAmortization({
  principalPaise: 15000000, // ₹1,50,000.00
  tenureMonths: 6,
  startDate: '2026-07-01',
  interestMode: 'monthly',
  interestValue: 1.5,
  lateFeeType: 'flat',
  lateFeePaise: 50000, // ₹500.00
  graceDays: 5,
});

// Update statuses of installments
const emiInstallments = sharmaAmortization.schedule.map((inst, index) => {
  if (index === 0) {
    return {
      ...inst,
      status: 'Paid' as const,
      paidDate: '2026-07-03',
      paidVia: 'UPI-HDFC-619284102941',
      lateFeeChargedPaise: 0,
    };
  }
  if (index === 1) {
    return {
      ...inst,
      status: 'Paid' as const,
      paidDate: '2026-08-02',
      paidVia: 'Bank-NEFT-8819201948',
      lateFeeChargedPaise: 0,
    };
  }
  if (index === 2) {
    return {
      ...inst,
      status: 'Overdue' as const,
      paidDate: null,
      paidVia: null,
      lateFeeChargedPaise: 50000, // ₹500.00 late fee
    };
  }
  return inst;
});

export const INITIAL_EMI_PLANS: EmiRestructuringPlan[] = [
  {
    id: 'EMI-2026-000412',
    tenantId: DEFAULT_TENANT_ID,
    partyId: 'pty-sharma-steel',
    title: 'Sharma Steel Works - Lathe Facility Restructuring Plan A',
    totalPrincipalPaise: 15000000,
    interestType: 'monthly',
    interestRatePercent: 1.5,
    totalInterestPaise: sharmaAmortization.totalInterestPaise,
    totalPayablePaise: sharmaAmortization.totalPayablePaise,
    installmentsCount: 6,
    startDate: '2026-07-01',
    lateFeeType: 'flat',
    lateFeePaise: 50000,
    graceDays: 5,
    status: 'Active',
    installments: emiInstallments,
    createdAt: '2026-07-01T08:00:00Z',
  },
];

export const INITIAL_AUDIT_LOGS: SecurityAuditRecord[] = [
  {
    id: 1,
    tenantId: DEFAULT_TENANT_ID,
    timestamp: '2026-07-01T08:00:00Z',
    actor: 'admin@rabooks.internal',
    action: 'CREATE_EMI_PLAN',
    target: 'EMI-2026-000412',
    details: 'Initialized 6-month restructuring plan for Sharma Steel Works (Principal: ₹1,50,000.00, Rate: 1.50% p.m.). Remainder absorption verified.',
  },
  {
    id: 2,
    tenantId: DEFAULT_TENANT_ID,
    timestamp: '2026-07-03T11:20:00Z',
    actor: 'settlements@rabooks.internal',
    action: 'SETTLE_INSTALLMENT',
    target: 'EMI-2026-000412 #1',
    details: 'Installment #1 settled via UPI-HDFC-619284102941. Total collected: ₹27,250.00.',
  },
  {
    id: 3,
    tenantId: DEFAULT_TENANT_ID,
    timestamp: '2026-08-05T10:00:00Z',
    actor: 'lender-ops@rabooks.internal',
    action: 'RECORD_TRANSACTION',
    target: 'RB-TXN-001001',
    details: 'Disbursement collection recorded from Reliance Petrochem Distributors. Total: ₹4,50,000.00. Multi-rail split: Bank (₹3,50,000) + Cheque (₹1,00,000). Reconciliation Δ=0.',
  },
  {
    id: 4,
    tenantId: DEFAULT_TENANT_ID,
    timestamp: '2026-08-12T11:15:00Z',
    actor: 'lender-ops@rabooks.internal',
    action: 'RECORD_TRANSACTION',
    target: 'RB-TXN-001003',
    details: 'Capital disbursement recorded to Sharma Steel Works. Total: ₹3,50,000.00. Multi-rail split: UPI (₹2,00,000) + Cash (₹1,50,000). Reconciliation Δ=0.',
  },
  {
    id: 5,
    tenantId: DEFAULT_TENANT_ID,
    timestamp: '2026-09-02T16:45:00Z',
    actor: 'lender-ops@rabooks.internal',
    action: 'RECORD_TRANSACTION',
    target: 'RB-TXN-001004',
    details: 'Repayment recorded from Sharma Steel Works. Total: ₹1,00,000.00 via UPI rail (UTR: UPI-HDFC-991028472911).',
  },
  {
    id: 6,
    tenantId: DEFAULT_TENANT_ID,
    timestamp: '2026-09-24T16:00:00Z',
    actor: 'security-daemon@rabooks.internal',
    action: 'DATABASE_ACID_VERIFICATION',
    target: 'raBooks_DB_v3',
    details: 'ACID verification successful. 5 counterparties, 7 canonical transactions, 1 EMI plan, and 6 audit records verified. Delta invariant 0 across all ledgers.',
  },
];

export const INITIAL_RECURRING_SCHEDULES: import('../core/models/recurring-schedule').RecurringSchedule[] = [
  {
    id: 'RB-SCHED-001001',
    tenantId: DEFAULT_TENANT_ID,
    partyId: 'pty-apex-logistics',
    title: 'Monthly Dedicated Fleet Retainer',
    type: 'GIVEN',
    frequency: 'MONTHLY',
    interval: 1,
    dayOfMonth: 5,
    totalAmountPaise: 3500000, // ₹35,000.00 strictly in integer paise
    splits: [
      {
        id: 'spl-tpl-001-1',
        method: 'Bank',
        amountPaise: 3500000,
        paymentReferencePrefix: 'NEFT-RETAINER',
        initiatedBy: 'Lender',
      },
    ],
    startDate: '2026-08-05',
    nextExecutionDate: '2026-10-05',
    lastExecutedDate: '2026-09-05',
    executionCount: 2,
    status: 'ACTIVE',
    notes: 'Recurring monthly fleet contract disbursement for corridor toll and fuel buffer.',
    autoProcess: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-09-05T12:00:00Z',
    createdBy: 'admin@rabooks.internal',
  },
  {
    id: 'RB-SCHED-001002',
    tenantId: DEFAULT_TENANT_ID,
    partyId: 'pty-mehta-textiles',
    title: 'Daily Yarn Delivery Payment Collection',
    type: 'TAKEN',
    frequency: 'DAILY',
    interval: 1,
    totalAmountPaise: 1250000, // ₹12,500.00
    splits: [
      {
        id: 'spl-tpl-002-1',
        method: 'UPI',
        amountPaise: 1250000,
        paymentReferencePrefix: 'UPI-AUTO-DAILY',
        initiatedBy: 'Debtor',
      },
    ],
    startDate: '2026-09-20',
    nextExecutionDate: '2026-09-25', // Due for execution on 2026-09-25
    lastExecutedDate: '2026-09-24',
    executionCount: 4,
    status: 'ACTIVE',
    notes: 'Automated daily settlement collection for consignment batch weaving runs.',
    autoProcess: true,
    createdAt: '2026-09-18T10:00:00Z',
    updatedAt: '2026-09-24T18:00:00Z',
    createdBy: 'admin@rabooks.internal',
  },
  {
    id: 'RB-SCHED-001003',
    tenantId: DEFAULT_TENANT_ID,
    partyId: 'pty-reliance-petro',
    title: 'Weekly Feedstock Procurement Credit',
    type: 'GIVEN',
    frequency: 'WEEKLY',
    interval: 1,
    dayOfWeek: 1, // Monday
    totalAmountPaise: 5000000, // ₹50,000.00
    splits: [
      {
        id: 'spl-tpl-003-1',
        method: 'Bank',
        amountPaise: 3000000,
        paymentReferencePrefix: 'RTGS-POLYMER',
        initiatedBy: 'Lender',
      },
      {
        id: 'spl-tpl-003-2',
        method: 'UPI',
        amountPaise: 2000000,
        paymentReferencePrefix: 'UPI-RELIANCE',
        initiatedBy: 'Lender',
      },
    ],
    startDate: '2026-09-07',
    nextExecutionDate: '2026-09-28',
    lastExecutedDate: '2026-09-21',
    executionCount: 3,
    maxExecutions: 12,
    status: 'ACTIVE',
    notes: 'Weekly polymer feedstock tranche line disbursement with split allocation parity.',
    autoProcess: false,
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-09-21T11:00:00Z',
    createdBy: 'lender-ops@rabooks.internal',
  },
];

