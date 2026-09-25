import React from 'react';
import { useLedger } from '../../db/repository-context';
import { formatPaiseToInr } from '../../core/formatters/currency';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Users,
  AlertCircle,
  Calendar,
} from 'lucide-react';

export const TelemetryGrid: React.FC = () => {
  const { parties, transactions, getPartyBalance } = useLedger();

  // Calculate To Receive, To Pay, and Settled parties
  let totalReceivablePaise = 0;
  let totalPayablePaise = 0;
  let receivablePartiesCount = 0;
  let payablePartiesCount = 0;
  let settledPartiesCount = 0;

  parties.forEach((p) => {
    const bal = getPartyBalance(p.id);
    if (bal > 0) {
      totalReceivablePaise += bal;
      receivablePartiesCount++;
    } else if (bal < 0) {
      totalPayablePaise += Math.abs(bal);
      payablePartiesCount++;
    } else {
      settledPartiesCount++;
    }
  });

  const netBalancePaise = totalReceivablePaise - totalPayablePaise;

  // Today's collections & disbursements
  const todayStr = new Date().toISOString().split('T')[0];
  let todayGivenPaise = 0;
  let todayTakenPaise = 0;

  transactions.forEach((t) => {
    if (t.status === 'Confirmed' && t.date === todayStr) {
      if (t.type === 'GIVEN') todayGivenPaise += t.totalAmountPaise;
      if (t.type === 'TAKEN') todayTakenPaise += t.totalAmountPaise;
    }
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. TO RECEIVE (Money owed to me) */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs relative flex flex-col justify-between hover:border-emerald-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-800 tracking-tight flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 inline-block" />
            TO RECEIVE
          </span>
          <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-700 border border-emerald-100">
            <ArrowDownLeft className="size-4" />
          </div>
        </div>

        <div className="mt-2.5">
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 tracking-tight">
            {formatPaiseToInr(totalReceivablePaise)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            From <span className="font-semibold text-slate-800">{receivablePartiesCount}</span> {receivablePartiesCount === 1 ? 'party' : 'parties'}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Customers & Borrowers</span>
          <span className="text-emerald-700 font-medium">Money due to you</span>
        </div>
      </div>

      {/* 2. TO PAY (Money I owe) */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs relative flex flex-col justify-between hover:border-rose-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-rose-800 tracking-tight flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-500 inline-block" />
            TO PAY
          </span>
          <div className="p-1.5 bg-rose-50 rounded-lg text-rose-700 border border-rose-100">
            <ArrowUpRight className="size-4" />
          </div>
        </div>

        <div className="mt-2.5">
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-700 tracking-tight">
            {formatPaiseToInr(totalPayablePaise)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            To <span className="font-semibold text-slate-800">{payablePartiesCount}</span> {payablePartiesCount === 1 ? 'party' : 'parties'}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Suppliers & Lenders</span>
          <span className="text-rose-700 font-medium">You owe them</span>
        </div>
      </div>

      {/* 3. NET BALANCE */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs relative flex flex-col justify-between hover:border-indigo-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 tracking-tight">
            NET BALANCE
          </span>
          <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-700 border border-indigo-100">
            <Wallet className="size-4" />
          </div>
        </div>

        <div className="mt-2.5">
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
            {formatPaiseToInr(Math.abs(netBalancePaise))}
          </div>
          <div className="text-xs font-medium mt-1">
            {netBalancePaise > 0 ? (
              <span className="text-emerald-700 font-semibold">Net Inflow Position (Surplus)</span>
            ) : netBalancePaise < 0 ? (
              <span className="text-rose-700 font-semibold">Net Outflow Position (Deficit)</span>
            ) : (
              <span className="text-slate-500 font-medium">Perfect Balance (₹0.00)</span>
            )}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Total Parties: {parties.length}</span>
          <span>{settledPartiesCount} Settled</span>
        </div>
      </div>

      {/* 4. TODAY'S TRANSACTIONS */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs relative flex flex-col justify-between hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 tracking-tight flex items-center gap-1.5">
            <Calendar className="size-3.5 text-slate-500" />
            TODAY'S ACTIVITY
          </span>
          <span className="text-[10px] text-slate-400 font-mono">{todayStr}</span>
        </div>

        <div className="mt-2.5 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
              Taken / Received:
            </span>
            <span className="font-bold font-mono text-emerald-700">
              {formatPaiseToInr(todayTakenPaise)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-rose-500 inline-block" />
              Given / Paid:
            </span>
            <span className="font-bold font-mono text-rose-700">
              {formatPaiseToInr(todayGivenPaise)}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Net Movement Today:</span>
          <span className={`font-mono font-semibold ${todayTakenPaise >= todayGivenPaise ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatPaiseToInr(todayTakenPaise - todayGivenPaise)}
          </span>
        </div>
      </div>
    </div>
  );
};
