import React, { useState } from 'react';
import { useLedger } from '../../db/repository-context';
import { CounterpartyEntity } from '../../core/models/counterparty';
import { formatPaiseToInr } from '../../core/formatters/currency';
import { calculateAccruedSimpleYield } from '../../core/math/interest';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PartyAvatar } from '../ui/PartyAvatar';
import {
  UserPlus,
  Search,
  Building2,
  Phone,
  Mail,
  Percent,
  Calendar,
  Trash2,
  Edit,
  ArrowUpRight,
  ArrowDownLeft,
  Calculator,
} from 'lucide-react';

interface PartiesViewProps {
  onOpenAddParty: () => void;
  onEditParty: (party: CounterpartyEntity) => void;
  onOpenGiveModalForParty: (partyId: string) => void;
  onOpenTakeModalForParty: (partyId: string) => void;
}

export const PartiesView: React.FC<PartiesViewProps> = ({
  onOpenAddParty,
  onEditParty,
  onOpenGiveModalForParty,
  onOpenTakeModalForParty,
}) => {
  const { parties, deleteParty, getPartyBalance, saveParty } = useLedger();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartyForYield, setSelectedPartyForYield] = useState<CounterpartyEntity | null>(null);
  const [yieldDays, setYieldDays] = useState<number>(30);

  const filtered = parties.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.relation.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (partyId: string, partyName: string) => {
    if (window.confirm(`Are you sure you wish to delete party record for "${partyName}"?`)) {
      await deleteParty(partyId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Parties Directory
          </h2>
          <p className="text-xs text-slate-500">
            Customers, suppliers, borrowers, lenders, and partners with current balances
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400 w-48 sm:w-60"
            />
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={onOpenAddParty}
          >
            Add Party
          </Button>
        </div>
      </div>

      {/* Grid of Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filtered.map((party) => {
          const balance = getPartyBalance(party.id);
          const isReceivable = balance > 0;
          const isPayable = balance < 0;

          const trustVariant =
            party.trustScore === 'green'
              ? 'trustGreen'
              : party.trustScore === 'amber'
              ? 'trustAmber'
              : 'trustRed';

          return (
            <div
              key={party.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PartyAvatar
                      name={party.name}
                      size="lg"
                      photoUrl={party.photoUrl}
                      editable
                      onPhotoChange={async (newUrl) => {
                        await saveParty({
                          ...party,
                          photoUrl: newUrl,
                          updatedAt: new Date().toISOString(),
                        });
                      }}
                      onPhotoRemove={
                        party.photoUrl
                          ? async () => {
                              await saveParty({
                                ...party,
                                photoUrl: undefined,
                                updatedAt: new Date().toISOString(),
                              });
                            }
                          : undefined
                      }
                    />
                    <div className="grow min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{party.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant={trustVariant} size="sm">
                          {party.relation}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditParty(party)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                      title="Edit party profile"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(party.id, party.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Delete party profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-3 space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans">Contact:</span>
                    <span>{party.phone}</span>
                  </div>
                  {party.upiId && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans">UPI Rail:</span>
                      <span className="text-indigo-600">{party.upiId}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans">Yield Rate:</span>
                    <span className="font-semibold text-slate-800">{party.ratePercentMonthly}% / mo</span>
                  </div>
                </div>
              </div>

              {/* Balance Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">
                    Net Position
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedPartyForYield(party)}
                    className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Calculator className="w-3 h-3" />
                    <span>Accrual Tool</span>
                  </button>
                </div>
                <div
                  className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
                    isReceivable
                      ? 'text-emerald-700'
                      : isPayable
                      ? 'text-rose-700'
                      : 'text-slate-700'
                  }`}
                >
                  {formatPaiseToInr(balance)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                  {isReceivable ? 'Due to Us' : isPayable ? 'Payable by Us' : 'Nil Balance'}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  icon={<ArrowDownLeft className="size-3.5" />}
                  onClick={() => onOpenTakeModalForParty(party.id)}
                  className="w-full text-xs"
                  aria-label={`Take / Collect payment from ${party.name}`}
                >
                  Take (Collect)
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  icon={<ArrowUpRight className="size-3.5" />}
                  onClick={() => onOpenGiveModalForParty(party.id)}
                  className="w-full text-xs"
                  aria-label={`Give / Disburse funds to ${party.name}`}
                >
                  Give (Disburse)
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Accrued Simple Yield Calculator Mini-Drawer */}
      {selectedPartyForYield && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Accrued Yield Calculator
                </h3>
                <p className="text-xs text-slate-500">{selectedPartyForYield.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPartyForYield(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Outstanding:</span>
                  <span className="font-mono font-bold">
                    {formatPaiseToInr(getPartyBalance(selectedPartyForYield.id))}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-500">Monthly Contract Rate:</span>
                  <span className="font-mono font-bold">
                    {selectedPartyForYield.ratePercentMonthly}% p.m.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Accrual Period (Days Elapsed)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={yieldDays}
                  onChange={(e) => setYieldDays(parseInt(e.target.value, 10) || 1)}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2"
                />
              </div>

              {(() => {
                const balance = Math.max(0, getPartyBalance(selectedPartyForYield.id));
                const yieldPaise = calculateAccruedSimpleYield(
                  balance,
                  selectedPartyForYield.ratePercentMonthly,
                  yieldDays
                );

                return (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-indigo-950 space-y-1">
                    <div className="text-[11px] uppercase font-semibold text-indigo-700">
                      Uncapitalized Accrued Yield
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums">
                      {formatPaiseToInr(yieldPaise)}
                    </div>
                    <div className="text-[10px] text-indigo-600 font-mono">
                      Formula: floor(Principal × (Rate/100) × (Days/30)) = {yieldPaise} paise
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedPartyForYield(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
