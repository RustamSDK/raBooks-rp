import React, { useState, useMemo } from 'react';
import { useLedger } from '../../db/repository-context';
import { CounterpartyEntity, PartyRelation } from '../../core/models/counterparty';
import { formatPaiseToInr } from '../../core/formatters/currency';
import { Badge } from '../ui/Badge';
import { PartyAvatar } from '../ui/PartyAvatar';
import {
  Search,
  Plus,
  Phone,
  AlertCircle,
  X,
  Filter,
  ArrowUpDown,
  RotateCcw,
  SlidersHorizontal,
  Users,
} from 'lucide-react';

interface CounterpartyListProps {
  selectedPartyId: string | null;
  onSelectParty: (partyId: string | null) => void;
  onOpenAddParty: () => void;
  onOpenGiveModalForParty: (partyId: string) => void;
  onOpenTakeModalForParty: (partyId: string) => void;
}

type BalanceFilterType = 'ALL' | 'RECEIVABLE' | 'PAYABLE' | 'OVERDUE' | 'SETTLED';
type SortOption = 'NAME_ASC' | 'NAME_DESC' | 'BALANCE_DESC' | 'BALANCE_ASC' | 'OVERDUE_FIRST';

const PARTY_RELATIONS: PartyRelation[] = [
  'Customer',
  'Supplier',
  'Borrower',
  'Lender',
  'Partner',
  'Employee',
  'Other',
];

export const CounterpartyList: React.FC<CounterpartyListProps> = ({
  selectedPartyId,
  onSelectParty,
  onOpenAddParty,
  onOpenGiveModalForParty,
  onOpenTakeModalForParty,
}) => {
  const { parties, getPartyBalance, saveParty } = useLedger();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilterType>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('NAME_ASC');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Derive counts per relation
  const relationCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: parties.length };
    for (const r of PARTY_RELATIONS) {
      counts[r] = 0;
    }
    for (const p of parties) {
      if (counts[p.relation] !== undefined) {
        counts[p.relation]++;
      }
    }
    return counts;
  }, [parties]);

  // Filter & Sort Logic
  const filteredParties = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return parties
      .filter((party) => {
        // 1. Text Search across Name, Phone, Relation/Type, Email, UPI
        if (q) {
          const matchName = party.name.toLowerCase().includes(q);
          const matchPhone = party.phone.toLowerCase().includes(q);
          const matchRelation = party.relation.toLowerCase().includes(q);
          const matchEmail = party.email ? party.email.toLowerCase().includes(q) : false;
          const matchUpi = party.upiId ? party.upiId.toLowerCase().includes(q) : false;
          const matchAddress = party.address ? party.address.toLowerCase().includes(q) : false;

          if (!matchName && !matchPhone && !matchRelation && !matchEmail && !matchUpi && !matchAddress) {
            return false;
          }
        }

        // 2. Type / Relation Filter
        if (selectedType !== 'ALL' && party.relation !== selectedType) {
          return false;
        }

        // 3. Balance / Status Filter
        if (balanceFilter !== 'ALL') {
          const bal = getPartyBalance(party.id);
          if (balanceFilter === 'RECEIVABLE' && bal <= 0) return false;
          if (balanceFilter === 'PAYABLE' && bal >= 0) return false;
          if (balanceFilter === 'SETTLED' && bal !== 0) return false;
          if (balanceFilter === 'OVERDUE' && !party.overdue) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'OVERDUE_FIRST') {
          if (a.overdue && !b.overdue) return -1;
          if (!a.overdue && b.overdue) return 1;
          return a.name.localeCompare(b.name);
        }
        if (sortOption === 'BALANCE_DESC') {
          const balA = Math.abs(getPartyBalance(a.id));
          const balB = Math.abs(getPartyBalance(b.id));
          return balB - balA;
        }
        if (sortOption === 'BALANCE_ASC') {
          const balA = Math.abs(getPartyBalance(a.id));
          const balB = Math.abs(getPartyBalance(b.id));
          return balA - balB;
        }
        if (sortOption === 'NAME_DESC') {
          return b.name.localeCompare(a.name);
        }
        return a.name.localeCompare(b.name);
      });
  }, [parties, searchTerm, selectedType, balanceFilter, sortOption, getPartyBalance]);

  const hasActiveFilters = searchTerm !== '' || selectedType !== 'ALL' || balanceFilter !== 'ALL';

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedType('ALL');
    setBalanceFilter('ALL');
    setSortOption('NAME_ASC');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col h-full">
      {/* Header with Title & Action */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <div>
              <h3 className="text-xs font-bold text-slate-900 tracking-tight uppercase">
                Counterparties
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                {parties.length} Registered Entities
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-white border-slate-200 shadow-2xs'
              }`}
              title="Toggle Advanced Filters"
              aria-label="Toggle Advanced Filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onOpenAddParty}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Register new counterparty"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Party</span>
            </button>
          </div>
        </div>

        {/* Real-time Search Input Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, phone, type, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none placeholder:text-slate-400 text-slate-900 shadow-2xs transition-all"
            aria-label="Search counterparties by name, phone, or type"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Party Type Filter Strip */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
          <button
            type="button"
            onClick={() => setSelectedType('ALL')}
            className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedType === 'ALL'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Types ({parties.length})
          </button>
          {PARTY_RELATIONS.map((rel) => {
            const count = relationCounts[rel] || 0;
            if (count === 0 && selectedType !== rel) return null; // hide 0-count types unless active
            return (
              <button
                key={rel}
                type="button"
                onClick={() => setSelectedType(rel)}
                className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedType === rel
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {rel} {count > 0 && <span className="opacity-70 font-mono text-[10px]">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Expandable Advanced Filtering (Status & Sort) */}
        {showAdvancedFilters && (
          <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                Balance Status
              </label>
              <select
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value as BalanceFilterType)}
                className="w-full text-xs py-1 px-2 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-700"
              >
                <option value="ALL">All Balances</option>
                <option value="RECEIVABLE">Receivables (&gt; ₹0)</option>
                <option value="PAYABLE">Payables (&lt; ₹0)</option>
                <option value="OVERDUE">Overdue Only</option>
                <option value="SETTLED">Settled (₹0)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                Sort Order
              </label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="w-full text-xs py-1 px-2 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-700"
              >
                <option value="NAME_ASC">Name (A to Z)</option>
                <option value="NAME_DESC">Name (Z to A)</option>
                <option value="BALANCE_DESC">Highest Volume</option>
                <option value="BALANCE_ASC">Lowest Volume</option>
                <option value="OVERDUE_FIRST">Overdue First</option>
              </select>
            </div>
          </div>
        )}

        {/* Active Filter Summary Bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between bg-indigo-50/60 px-2 py-1 rounded text-[11px] text-indigo-900 border border-indigo-100">
            <span className="font-medium">
              Showing {filteredParties.length} of {parties.length} parties
            </span>
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        )}
      </div>

      {/* "All Parties" selection pill */}
      <div className="p-2 border-b border-slate-100 bg-slate-50/30">
        <button
          type="button"
          onClick={() => onSelectParty(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
            selectedPartyId === null
              ? 'bg-slate-900 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>All Counterparties (Consolidated)</span>
          <span className="text-[10px] font-mono opacity-80">View Full Ledger</span>
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto divide-y divide-slate-100 grow max-h-[550px]">
        {filteredParties.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Filter className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No matching counterparties found</p>
            <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
              No entities match the search query &quot;{searchTerm}&quot; and selected filters.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear All Filters</span>
              </button>
            )}
          </div>
        ) : (
          filteredParties.map((party) => {
            const isSelected = selectedPartyId === party.id;
            const balancePaise = getPartyBalance(party.id);
            const isReceivable = balancePaise > 0;
            const isPayable = balancePaise < 0;

            const trustVariant =
              party.trustScore === 'green'
                ? 'trustGreen'
                : party.trustScore === 'amber'
                ? 'trustAmber'
                : 'trustRed';

            return (
              <div
                key={party.id}
                onClick={() => onSelectParty(party.id)}
                className={`p-3 text-left transition-colors cursor-pointer select-none ${
                  isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div onClick={(e) => e.stopPropagation()}>
                    <PartyAvatar
                      name={party.name}
                      size="md"
                      photoUrl={party.photoUrl}
                      className="mt-0.5 shrink-0"
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
                  </div>
                  <div className="grow min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {party.name}
                      </span>
                      {party.overdue && (
                        <span title="Overdue payments flagged">
                          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{party.phone}</span>
                    </div>
                    {party.email && (
                      <div className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">
                        {party.email}
                      </div>
                    )}
                  </div>

                  {/* Balance Display */}
                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs font-mono font-bold tabular-nums ${
                        isReceivable
                          ? 'text-emerald-700'
                          : isPayable
                          ? 'text-rose-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {formatPaiseToInr(balancePaise)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      {isReceivable ? 'Receivable' : isPayable ? 'Payable' : 'Settled'}
                    </div>
                  </div>
                </div>

                {/* Badges footer */}
                <div className="flex items-center justify-between gap-1 mt-2 pt-1 border-t border-slate-100/60">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={trustVariant} size="sm">
                      {party.relation}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {party.ratePercentMonthly}% p.m.
                    </span>
                  </div>

                  {/* Quick Give/Take Buttons */}
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenTakeModalForParty(party.id)}
                      className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded cursor-pointer transition-colors border border-emerald-200"
                      title="Collect repayment from party"
                      aria-label={`Collect repayment from ${party.name}`}
                    >
                      + Take (In)
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenGiveModalForParty(party.id)}
                      className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded cursor-pointer transition-colors border border-rose-200"
                      title="Disburse funds to party"
                      aria-label={`Disburse funds to ${party.name}`}
                    >
                      - Give (Out)
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
