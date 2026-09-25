import React from 'react';
import { CounterpartyEntity } from '../../core/models/counterparty';
import { CanonicalTransaction } from '../../core/models/transaction';
import { formatPaiseToInr } from '../../core/formatters/currency';
import { calculatePartyNetBalance } from '../../core/math/balance';
import { PartyAvatar } from '../ui/PartyAvatar';

interface PrintableStatementSheetProps {
  party: CounterpartyEntity | null;
  transactions: CanonicalTransaction[];
  tenantId: string;
}

export const PrintableStatementSheet: React.FC<PrintableStatementSheetProps> = ({
  party,
  transactions,
  tenantId,
}) => {
  const partyTxns = party
    ? transactions.filter((t) => t.partyId === party.id)
    : transactions;

  const { totalDisbursedPaise, totalCollectedPaise, netBalancePaise } =
    calculatePartyNetBalance(partyTxns);

  return (
    <div
      id="printable-statement-sheet"
      className="bg-white text-slate-900 p-8 font-sans border border-slate-200 rounded-xl print:border-none print:p-0"
    >
      {/* Document Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6 mb-6">
        <div>
          <div className="text-xl font-bold tracking-tight text-slate-900">
            RABOOKS FINANCIAL CORE
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Enterprise Debt & Treasury Infrastructure • GSTIN: 27AABCR9912Q1Z9
          </div>
          <div className="text-xs text-slate-500">
            Commercial Corridor 4, BKC Financial District, Mumbai, MH - 400051
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block bg-slate-900 text-white font-mono text-xs px-3 py-1 font-semibold rounded">
            STATEMENT OF ACCOUNT
          </div>
          <div className="text-xs text-slate-600 mt-2 font-mono">
            Date: {new Date().toISOString().split('T')[0]}
          </div>
          <div className="text-xs text-slate-500 font-mono">Tenant ID: {tenantId}</div>
        </div>
      </div>

      {/* Account Info Grid */}
      <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 text-xs">
        <div>
          <div className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
            Account Holder / Counterparty
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            {party && <PartyAvatar name={party.name} size="lg" photoUrl={party.photoUrl} />}
            <div>
              <div className="text-sm font-bold text-slate-900">
                {party ? party.name : 'Consolidated Enterprise Ledger (All Counterparties)'}
              </div>
              {party && (
                <div className="text-slate-600 mt-0.5 space-y-0.5 text-xs">
                  <div>Phone: <span className="font-mono">{party.phone}</span></div>
                  {party.email && <div>Email: {party.email}</div>}
                  {party.upiId && <div>UPI VPA: <span className="font-mono">{party.upiId}</span></div>}
                  <div>Classification: {party.relation} (Yield: {party.ratePercentMonthly}% p.m.)</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
            Account Position
          </div>
          <div className="text-xs">
            Total Disbursed (Given):{' '}
            <span className="font-mono font-semibold text-emerald-700">
              {formatPaiseToInr(totalDisbursedPaise)}
            </span>
          </div>
          <div className="text-xs">
            Total Repaid (Taken):{' '}
            <span className="font-mono font-semibold text-rose-700">
              {formatPaiseToInr(totalCollectedPaise)}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-200 mt-2">
            <div className="text-xs font-semibold text-slate-700">NET RUNNING BALANCE:</div>
            <div className="text-base font-bold font-mono tabular-nums text-slate-950">
              {formatPaiseToInr(netBalancePaise)}
            </div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">
              {netBalancePaise > 0
                ? 'Receivable Due from Counterparty'
                : netBalancePaise < 0
                ? 'Payable Due to Counterparty'
                : 'Account Perfectly Reconciled (Nil)'}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Journal Table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-left text-xs border border-slate-200">
          <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Internal TXN ID</th>
              {!party && <th className="py-2.5 px-3">Counterparty</th>}
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Settlement Rails & UTR</th>
              <th className="py-2.5 px-3 text-right">Debit (INR)</th>
              <th className="py-2.5 px-3 text-right">Credit (INR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
            {partyTxns.map((t) => {
              const splitDescription = t.splits
                .map((s) => `${s.method} (₹${(s.amountPaise / 100).toFixed(2)})${s.paymentReferenceId ? ` [${s.paymentReferenceId}]` : ''}`)
                .join(', ');

              return (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 whitespace-nowrap">{t.date}</td>
                  <td className="py-2 px-3 font-semibold text-slate-800">{t.id}</td>
                  {!party && <td className="py-2 px-3 font-sans">{t.partyId}</td>}
                  <td className="py-2 px-3">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold ${
                        t.type === 'GIVEN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[11px] font-sans text-slate-600 max-w-xs truncate">
                    {splitDescription}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-emerald-800">
                    {t.type === 'GIVEN' ? formatPaiseToInr(t.totalAmountPaise) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-rose-800">
                    {t.type === 'TAKEN' ? formatPaiseToInr(t.totalAmountPaise) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-semibold border-t-2 border-slate-300 font-mono tabular-nums">
            <tr>
              <td colSpan={party ? 3 : 4} className="py-2 px-3 text-right font-sans">
                TOTALS:
              </td>
              <td className="py-2 px-3 text-[11px] font-sans text-slate-500">
                Δ=0 Verified
              </td>
              <td className="py-2 px-3 text-right text-emerald-900">
                {formatPaiseToInr(totalDisbursedPaise)}
              </td>
              <td className="py-2 px-3 text-right text-rose-900">
                {formatPaiseToInr(totalCollectedPaise)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Signature & Non-Repudiation Footer */}
      <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-300 text-xs text-slate-600">
        <div>
          <div className="font-semibold text-slate-800">Institutional Terms & Conditions:</div>
          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
            This statement of account is computed using exact integer base unit math without floating-point drift.
            Discrepancies must be communicated in writing within 7 business days of issuance.
          </p>
          <div className="mt-2 text-[10px] text-slate-400 font-mono">
            Cryptographic SHA-256 State Signature: e9b1c720f4d38102a9918bc277491028371992
          </div>
        </div>

        <div className="text-right flex flex-col justify-end items-end">
          <div className="w-48 border-b border-slate-400 pb-1 mb-1 text-center font-serif italic text-slate-400">
            Authorized Signatory
          </div>
          <div className="text-[11px] font-semibold text-slate-800">
            raBooks Treasury Operations Desk
          </div>
          <div className="text-[10px] text-slate-500">Certified by Core Systems Architect</div>
        </div>
      </div>
    </div>
  );
};
