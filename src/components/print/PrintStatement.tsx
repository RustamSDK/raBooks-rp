import React from 'react';
import { CounterpartyEntity } from '../../core/models/counterparty';
import { CanonicalTransaction } from '../../core/models/transaction';
import { formatPaiseToInr } from '../../core/formatters/currency';
import { calculatePartyNetBalance } from '../../core/math/balance';
import { ProviderIcon } from '../ui/ProviderIcon';
import { PartyAvatar } from '../ui/PartyAvatar';
import { A4ReceiptTheme } from './PrintReceipt';

interface PrintStatementProps {
  party: CounterpartyEntity | null;
  transactions: CanonicalTransaction[];
  documentType?: 'statement' | 'ledger';
  theme?: A4ReceiptTheme;
}

export const PrintStatement: React.FC<PrintStatementProps> = ({
  party,
  transactions,
  documentType = 'statement',
  theme = 'modern-minimal',
}) => {
  const partyTxns = party
    ? transactions.filter((t) => t.partyId === party.id && t.status === 'Confirmed')
    : transactions.filter((t) => t.status === 'Confirmed');

  // Sort chronologically ascending for statement ledger
  const sortedTxns = [...partyTxns].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const { totalDisbursedPaise, totalCollectedPaise, netBalancePaise } =
    calculatePartyNetBalance(sortedTxns);

  const documentTitle =
    documentType === 'ledger'
      ? 'PARTY ACCOUNT LEDGER'
      : 'STATEMENT OF ACCOUNT';

  // Running balance derivation
  let running = 0;
  const rowsWithBalance = sortedTxns.map((t) => {
    if (t.type === 'GIVEN') {
      running += t.totalAmountPaise;
    } else {
      running -= t.totalAmountPaise;
    }
    return { txn: t, runningPaise: running };
  });

  const isClassic = theme === 'classic-ledger' || theme === 'traditional-ledger' || theme === 'professional-accounting';
  const isCompact = theme === 'compact-statement' || theme === 'compact-business';

  return (
    <div
      id="printable-statement-sheet"
      className={`bg-white text-slate-900 max-w-4xl mx-auto rounded-xl print:border-none print:shadow-none print:p-0 ${
        theme === 'modern-minimal'
          ? 'p-8 md:p-10 border border-slate-200/90 shadow-sm font-sans'
          : isClassic
          ? 'p-8 border-2 border-slate-900 font-serif bg-amber-50/10'
          : isCompact
          ? 'p-5 border border-slate-300 text-xs font-sans'
          : 'p-8 border border-slate-200 font-sans'
      }`}
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      {/* Header */}
      <div
        className={`flex items-start justify-between pb-4 ${
          isClassic
            ? 'border-b-2 border-slate-900 pb-4'
            : isCompact
            ? 'border-b border-slate-300 pb-3'
            : 'border-b border-slate-200 pb-5'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <h1
              className={`font-black tracking-tight text-slate-900 ${
                isClassic
                  ? 'text-2xl font-serif'
                  : isCompact
                  ? 'text-xl font-display'
                  : 'text-2xl font-extrabold font-display'
              }`}
            >
              raBooks
            </h1>
            {theme === 'modern-minimal' && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                OFFICIAL STATEMENT
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Digital Khata & Double-Entry Accounting Ledger
          </p>
        </div>

        <div className="text-right">
          <span
            className={`inline-block px-3 py-1 font-bold text-xs uppercase tracking-wider ${
              isClassic
                ? 'bg-slate-900 text-white rounded-none border border-slate-900'
                : isCompact
                ? 'bg-slate-800 text-white rounded text-[10px] py-0.5 px-2'
                : 'bg-indigo-600 text-white rounded-full'
            }`}
          >
            {documentTitle}
          </span>
          <div className="text-xs text-slate-600 mt-1.5 font-mono">
            Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="text-[11px] text-slate-500">
            Records: {sortedTxns.length} transactions
          </div>
        </div>
      </div>

      {/* Account Info Bar with Avatar */}
      <div
        className={`my-4 ${
          isClassic
            ? 'p-3.5 bg-amber-50/30 border border-slate-900 rounded-none'
            : isCompact
            ? 'p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs'
            : 'p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl'
        } grid grid-cols-1 md:grid-cols-2 gap-4`}
      >
        <div className="flex items-center gap-3">
          <PartyAvatar
            name={party ? party.name : 'Consolidated Ledger'}
            size={isCompact ? 'md' : 'lg'}
            photoUrl={party?.photoUrl}
          />
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Account Holder
            </div>
            <div className={`font-bold text-slate-900 ${isClassic ? 'text-lg font-serif' : 'text-base'}`}>
              {party ? party.name : 'Consolidated Ledger (All Parties)'}
            </div>
            {party && (
              <div className="text-xs text-slate-600 mt-0.5 space-x-2">
                <span className="bg-slate-200/80 px-1.5 py-0.2 rounded text-[11px] font-medium">
                  {party.relation}
                </span>
                {party.phone && party.phone !== '—' && <span>Phone: {party.phone}</span>}
                {party.email && <span>Email: {party.email}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="text-right flex flex-col justify-center space-y-1">
          <div className="text-xs text-slate-600">
            Total Given (Outflow):{' '}
            <span className="font-mono font-bold text-rose-700">
              {formatPaiseToInr(totalDisbursedPaise)}
            </span>
          </div>
          <div className="text-xs text-slate-600">
            Total Taken (Inflow):{' '}
            <span className="font-mono font-bold text-emerald-700">
              {formatPaiseToInr(totalCollectedPaise)}
            </span>
          </div>
          <div className="pt-1 border-t border-slate-200">
            <span className="text-xs font-semibold text-slate-700">Closing Balance: </span>
            <span
              className={`font-mono font-bold text-sm tabular-nums ${
                isClassic
                  ? 'border-b-2 border-slate-900 pb-0.5 inline-block ' + (netBalancePaise > 0 ? 'text-emerald-800' : 'text-rose-800')
                  : netBalancePaise > 0
                  ? 'text-emerald-700'
                  : netBalancePaise < 0
                  ? 'text-rose-700'
                  : 'text-slate-700'
              }`}
            >
              {formatPaiseToInr(Math.abs(netBalancePaise))}
            </span>
            <span className="text-[11px] text-slate-500 uppercase font-medium ml-1">
              ({netBalancePaise > 0 ? 'Receivable' : netBalancePaise < 0 ? 'Payable' : 'Settled'})
            </span>
          </div>
        </div>
      </div>

      {/* Transaction History Table */}
      <div
        className={`my-4 overflow-hidden border border-slate-200 ${
          isClassic ? 'border-collapse border-slate-900 rounded-none' : 'rounded-lg'
        }`}
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead
            className={`${
              isClassic
                ? 'bg-slate-900 text-white font-serif'
                : 'bg-slate-100 text-slate-800 font-semibold'
            } border-b border-slate-200`}
          >
            <tr>
              <th className="py-2 px-3">Date</th>
              <th className="py-2 px-3">Transaction ID</th>
              <th className="py-2 px-3">Movement</th>
              <th className="py-2 px-3">Purpose</th>
              <th className="py-2 px-3">Payment Method</th>
              <th className="py-2 px-3 text-right">Given (Out)</th>
              <th className="py-2 px-3 text-right">Taken (In)</th>
              <th className="py-2 px-3 text-right">Running Balance</th>
            </tr>
          </thead>
          <tbody
            className={`divide-y divide-slate-100 font-mono ${
              isCompact ? 'text-[11px]' : 'text-xs'
            }`}
          >
            {rowsWithBalance.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                  No confirmed transactions on record for this account.
                </td>
              </tr>
            ) : (
              rowsWithBalance.map(({ txn, runningPaise }) => {
                const isGiven = txn.type === 'GIVEN';
                return (
                  <tr
                    key={txn.id}
                    className={`${isClassic ? 'border-b border-slate-200' : 'hover:bg-slate-50/60'}`}
                  >
                    <td className="py-1.5 px-3 text-slate-700 whitespace-nowrap">{txn.date}</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {txn.id}
                    </td>
                    <td className="py-1.5 px-3 font-sans whitespace-nowrap">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isGiven
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isGiven ? 'GIVEN 🔴' : 'TAKEN 🟢'}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 font-sans text-slate-600 whitespace-nowrap">
                      {txn.purpose || (isGiven ? 'Given' : 'Received')}
                    </td>
                    <td className="py-1.5 px-3 font-sans whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <ProviderIcon
                          provider={txn.splits[0]?.provider || txn.provider}
                          method={txn.splits[0]?.method}
                          size="sm"
                          showLabel
                        />
                        {txn.splits[0]?.paymentReferenceId && (
                          <span className="text-[10px] font-mono text-slate-400">
                            ({txn.splits[0].paymentReferenceId})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 px-3 text-right font-semibold text-rose-700">
                      {isGiven ? formatPaiseToInr(txn.totalAmountPaise) : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-semibold text-emerald-700">
                      {!isGiven ? formatPaiseToInr(txn.totalAmountPaise) : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-slate-950 font-mono">
                      {formatPaiseToInr(Math.abs(runningPaise))}
                      <span className="text-[9px] text-slate-400 uppercase font-sans ml-1">
                        {runningPaise >= 0 ? 'Dr' : 'Cr'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Signature & Verification */}
      <div
        className={`${
          isCompact ? 'mt-6 pt-4' : 'mt-8 pt-6'
        } border-t border-slate-200 grid grid-cols-2 gap-6 text-center text-xs`}
      >
        <div>
          <div className="border-b border-slate-300 pb-6" />
          <div className="mt-1.5 font-semibold text-slate-700">Authorized Accountant / Owner</div>
          <div className="text-[10px] text-slate-400">raBooks Account Verification</div>
        </div>

        <div>
          <div className="border-b border-slate-300 pb-6" />
          <div className="mt-1.5 font-semibold text-slate-700">
            Account Holder Confirmation
          </div>
          <div className="text-[10px] text-slate-400">
            {party ? party.name : 'Counterparty Representative'}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400 flex items-center justify-between">
        <span>Template: <strong className="text-slate-600 font-sans capitalize">{theme.replace('-', ' ')}</strong></span>
        <span>Generated via raBooks • Digital Khata & Accounting Ledger</span>
      </div>
    </div>
  );
};
