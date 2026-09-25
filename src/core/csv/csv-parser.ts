import { CanonicalTransaction, MovementType, PaymentRail, PaymentSplitAllocation } from '../models/transaction';
import { CounterpartyEntity } from '../models/counterparty';
import { parseRupeesToPaise } from '../formatters/currency';
import { validateTransactionInvariants } from '../validation/invariants';

export interface ParsedCsvRow {
  rowNumber: number;
  raw: Record<string, string>;
  canonicalTxn: CanonicalTransaction | null;
  partyName: string;
  matchedParty: CounterpartyEntity | null;
  isValid: boolean;
  validationErrors: string[];
}

export interface CsvImportResult {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  totalValidPaise: number;
  newPartiesToCreate: CounterpartyEntity[];
  rows: ParsedCsvRow[];
}

/**
 * Standard RFC 4180 CSV parser handling quoted fields, commas, escaped quotes, and newlines.
 */
export function parseRfc4180Csv(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.length > 0 && currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses and validates CSV records into CanonicalTransaction structures using existing transaction validation logic.
 */
export function parseCsvToTransactions(
  csvText: string,
  existingParties: CounterpartyEntity[],
  tenantId: string
): CsvImportResult {
  const rawRows = parseRfc4180Csv(csvText);

  if (rawRows.length < 2) {
    return {
      totalRows: 0,
      validRowsCount: 0,
      invalidRowsCount: 0,
      totalValidPaise: 0,
      newPartiesToCreate: [],
      rows: [],
    };
  }

  // Header normalization
  const headerRow = rawRows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const dataRows = rawRows.slice(1);

  const getColIndex = (aliases: string[]): number => {
    for (const alias of aliases) {
      const idx = headerRow.findIndex((h) => h.includes(alias.toLowerCase().replace(/[^a-z0-9]/g, '')));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idIdx = getColIndex(['transactionid', 'txnid', 'id']);
  const dateIdx = getColIndex(['date', 'txndate', 'timestamp']);
  const partyIdx = getColIndex(['counterparty', 'party', 'partyname', 'partyid', 'customer', 'vendor']);
  const typeIdx = getColIndex(['movementtype', 'type', 'direction', 'movement']);
  const inrAmountIdx = getColIndex(['totalamountinr', 'amountinr', 'amount', 'totalamount']);
  const paiseAmountIdx = getColIndex(['totalamountpaise', 'amountpaise', 'paise']);
  const splitsIdx = getColIndex(['paymentrails', 'splits', 'rail', 'method', 'paymentrail']);
  const refIdx = getColIndex(['externalreference', 'reference', 'utr', 'chequeno', 'ref']);
  const notesIdx = getColIndex(['narration', 'notes', 'description', 'remarks', 'memo']);

  const parsedRows: ParsedCsvRow[] = [];
  const usedIds = new Set<string>();
  const newPartiesMap = new Map<string, CounterpartyEntity>();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2; // 1-indexed including header
    const rawMap: Record<string, string> = {};
    rawRows[0].forEach((colName, idx) => {
      rawMap[colName] = row[idx] || '';
    });

    const errors: string[] = [];

    // 1. Transaction ID - ensure canonical format and uniqueness
    let txnId = idIdx !== -1 && row[idIdx] ? row[idIdx].trim() : '';
    if (!txnId.startsWith('RB-TXN-') || usedIds.has(txnId)) {
      let candidateId = '';
      do {
        const randomHex = Math.floor(100000 + Math.random() * 900000).toString();
        candidateId = `RB-TXN-${randomHex}`;
      } while (usedIds.has(candidateId));
      txnId = candidateId;
    }
    usedIds.add(txnId);

    // 2. Date
    let dateStr = dateIdx !== -1 && row[dateIdx] ? row[dateIdx].trim() : '';
    if (!dateStr || isNaN(Date.parse(dateStr))) {
      dateStr = new Date().toISOString().split('T')[0];
    } else {
      dateStr = new Date(dateStr).toISOString().split('T')[0];
    }

    // 3. Counterparty
    const rawPartyStr = partyIdx !== -1 && row[partyIdx] ? row[partyIdx].trim() : '';
    let matchedParty: CounterpartyEntity | null = null;

    if (rawPartyStr) {
      matchedParty =
        existingParties.find(
          (p) =>
            p.id.toLowerCase() === rawPartyStr.toLowerCase() ||
            p.name.toLowerCase() === rawPartyStr.toLowerCase()
        ) ||
        existingParties.find(
          (p) =>
            p.name.toLowerCase().includes(rawPartyStr.toLowerCase()) ||
            rawPartyStr.toLowerCase().includes(p.name.toLowerCase())
        ) ||
        null;
    }

    if (!rawPartyStr && !matchedParty) {
      errors.push('Missing counterparty entity name or ID.');
    }

    // 4. Movement Type
    const rawType = typeIdx !== -1 && row[typeIdx] ? row[typeIdx].trim().toUpperCase() : 'GIVEN';
    let movementType: MovementType = 'GIVEN';
    if (rawType.includes('TAKE') || rawType.includes('COLLECT') || rawType.includes('CREDIT') || rawType.includes('REPAY')) {
      movementType = 'TAKEN';
    } else if (rawType.includes('GIVE') || rawType.includes('DISBURSE') || rawType.includes('DEBIT') || rawType.includes('LOAN')) {
      movementType = 'GIVEN';
    }

    // 5. Total Amount in Paise (Law 1: Integer Precision)
    let totalAmountPaise = 0;
    if (paiseAmountIdx !== -1 && row[paiseAmountIdx]) {
      totalAmountPaise = parseInt(row[paiseAmountIdx].replace(/[^0-9-]/g, ''), 10) || 0;
    }
    if (totalAmountPaise <= 0 && inrAmountIdx !== -1 && row[inrAmountIdx]) {
      totalAmountPaise = parseRupeesToPaise(row[inrAmountIdx]);
    }

    if (totalAmountPaise <= 0) {
      errors.push('Total amount must be greater than zero.');
    }

    // 6. Payment Rail & Splits (Law 2: Reconciliation Δ = 0)
    const rawSplitsStr = splitsIdx !== -1 && row[splitsIdx] ? row[splitsIdx].trim() : '';
    const rawRefStr = refIdx !== -1 && row[refIdx] ? row[refIdx].trim() : '';
    const notesStr = notesIdx !== -1 && row[notesIdx] ? row[notesIdx].trim() : 'Bulk CSV ledger import';

    const splits: PaymentSplitAllocation[] = [];

    if (rawSplitsStr && rawSplitsStr.includes(';')) {
      // Multiple splits format: "Bank: 350000; Cheque: 100000" or similar
      const parts = rawSplitsStr.split(';').map((p) => p.trim()).filter(Boolean);
      parts.forEach((part, partIdx) => {
        let rail: PaymentRail = 'UPI';
        const upper = part.toUpperCase();
        if (upper.includes('CASH')) rail = 'Cash';
        else if (upper.includes('BANK') || upper.includes('NEFT') || upper.includes('RTGS')) rail = 'Bank';
        else if (upper.includes('CHEQUE') || upper.includes('CHQ')) rail = 'Cheque';
        else if (upper.includes('UPI')) rail = 'UPI';

        const amountPaise = parseRupeesToPaise(part);
        splits.push({
          id: `spl-${Date.now()}-${i}-${partIdx}`,
          method: rail,
          amountPaise: amountPaise > 0 ? amountPaise : Math.floor(totalAmountPaise / parts.length),
          paymentReferenceId: rawRefStr || undefined,
          initiatedBy: movementType === 'GIVEN' ? 'Lender' : 'Debtor',
          confirmed: true,
        });
      });
    } else {
      // Single rail format
      let rail: PaymentRail = 'UPI';
      const upper = (rawSplitsStr || '').toUpperCase();
      if (upper.includes('CASH')) rail = 'Cash';
      else if (upper.includes('BANK') || upper.includes('NEFT') || upper.includes('RTGS')) rail = 'Bank';
      else if (upper.includes('CHEQUE') || upper.includes('CHQ')) rail = 'Cheque';
      else if (upper.includes('UPI')) rail = 'UPI';

      splits.push({
        id: `spl-${Date.now()}-${i}-0`,
        method: rail,
        amountPaise: totalAmountPaise,
        paymentReferenceId: rawRefStr || undefined,
        initiatedBy: movementType === 'GIVEN' ? 'Lender' : 'Debtor',
        confirmed: true,
      });
    }

    // Auto-balance last split remainder if minor division difference occurred
    if (splits.length > 1) {
      const sum = splits.reduce((acc, s) => acc + s.amountPaise, 0);
      const diff = totalAmountPaise - sum;
      if (diff !== 0) {
        splits[splits.length - 1] = {
          ...splits[splits.length - 1],
          amountPaise: splits[splits.length - 1].amountPaise + diff,
        };
      }
    }

    const partyId = matchedParty
      ? matchedParty.id
      : `pty-${rawPartyStr.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

    if (!matchedParty && rawPartyStr && !newPartiesMap.has(partyId)) {
      const now = new Date().toISOString();
      newPartiesMap.set(partyId, {
        id: partyId,
        tenantId,
        name: rawPartyStr,
        phone: '+91 00000 00000',
        relation: movementType === 'GIVEN' ? 'Borrower' : 'Customer',
        ratePercentMonthly: 1.5,
        trustScore: 'green',
        overdue: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    const canonicalTxn: CanonicalTransaction = {
      id: txnId,
      tenantId,
      partyId,
      type: movementType,
      totalAmountPaise,
      date: dateStr,
      notes: notesStr,
      status: 'Confirmed',
      splits,
      createdAt: new Date().toISOString(),
      createdBy: 'csv-bulk-importer@rabooks.internal',
    };

    // Run official invariant validation logic
    const validationResult = validateTransactionInvariants(canonicalTxn);
    if (!validationResult.valid) {
      errors.push(...validationResult.errors);
    }

    parsedRows.push({
      rowNumber,
      raw: rawMap,
      canonicalTxn,
      partyName: rawPartyStr,
      matchedParty,
      isValid: errors.length === 0,
      validationErrors: errors,
    });
  }

  const validRows = parsedRows.filter((r) => r.isValid);
  const validRowsCount = validRows.length;
  const invalidRowsCount = parsedRows.length - validRowsCount;
  const totalValidPaise = validRows.reduce((sum, r) => sum + (r.canonicalTxn?.totalAmountPaise || 0), 0);

  return {
    totalRows: parsedRows.length,
    validRowsCount,
    invalidRowsCount,
    totalValidPaise,
    newPartiesToCreate: Array.from(newPartiesMap.values()),
    rows: parsedRows,
  };
}

export const SAMPLE_CSV_TEMPLATE = `Transaction ID,Date,Counterparty,Movement Type,Total Amount (INR),Payment Rails & Splits,External Reference IDs,Narration
RB-TXN-101001,2026-09-20,Reliance Petrochem Distributors,GIVEN,75000.00,Bank,NEFT-ICICI-260920491,Raw materials batch procurement
RB-TXN-101002,2026-09-21,Sharma Steel Works,TAKEN,30000.00,UPI,UPI-HDFC-8819201948,Settlement installment collection
RB-TXN-101003,2026-09-22,Apex Logistics Private Limited,GIVEN,45000.00,UPI: 25000; Cash: 20000,UPI-SBI-6619204,Fleet diesel and toll corridor advance
RB-TXN-101004,2026-09-23,Mehta Textiles Syndicate,GIVEN,125000.00,Bank,RTGS-AXIS-9918237,Export container yarn credit line`;
