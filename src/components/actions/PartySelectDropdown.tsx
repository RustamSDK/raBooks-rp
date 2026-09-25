import React, { useState, useRef, useEffect } from 'react';
import { useLedger } from '../../db/repository-context';
import { CounterpartyEntity, PartyRelation } from '../../core/models/counterparty';
import { PartyAvatar } from '../ui/PartyAvatar';
import { formatPaiseToInr } from '../../core/formatters/currency';
import {
  Search,
  UserPlus,
  Check,
  ChevronDown,
  X,
  Phone,
  Mail,
  Building,
  Plus,
} from 'lucide-react';

interface PartySelectDropdownProps {
  value: string; // partyId
  onChange: (partyId: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const PartySelectDropdown: React.FC<PartySelectDropdownProps> = ({
  value,
  onChange,
  required = true,
  disabled = false,
  className = '',
}) => {
  const { parties, saveParty, getPartyBalance } = useLedger();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isCreatingInline, setIsCreatingInline] = useState(false);

  // Inline Party Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRelation, setNewRelation] = useState<PartyRelation>('Customer');
  const [newNotes, setNewNotes] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreatingInline(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && !isCreatingInline && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, isCreatingInline]);

  const selectedParty = parties.find((p) => p.id === value);

  const filteredParties = parties.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      p.relation.toLowerCase().includes(q)
    );
  });

  const handleSelectParty = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearch('');
  };

  const handleCreateNewParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newName.trim()) {
      setFormError('Party Name is required.');
      return;
    }

    const newId = `party-${Date.now()}`;
    const newEntity: CounterpartyEntity = {
      id: newId,
      tenantId: 'TENANT-DEFAULT',
      name: newName.trim(),
      phone: newPhone.trim() || '—',
      email: newEmail.trim() || undefined,
      notes: newNotes.trim() || undefined,
      photoUrl: newPhotoUrl || undefined,
      relation: newRelation,
      ratePercentMonthly: 0,
      trustScore: 'green',
      overdue: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveParty(newEntity);
      // Auto-select newly created party, keep transaction state intact
      onChange(newId);
      setIsCreatingInline(false);
      setIsOpen(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewNotes('');
      setNewPhotoUrl(undefined);
      setSearch('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to save party');
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setIsCreatingInline(false);
          }
        }}
        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 bg-white border rounded-lg text-left text-sm transition-all cursor-pointer ${
          isOpen
            ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-2xs'
            : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedParty ? (
            <>
              <PartyAvatar name={selectedParty.name} size="sm" photoUrl={selectedParty.photoUrl} />
              <div className="truncate">
                <div className="font-semibold text-slate-900 truncate">{selectedParty.name}</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span>{selectedParty.relation}</span>
                  {selectedParty.phone && selectedParty.phone !== '—' && (
                    <>
                      <span>•</span>
                      <span>{selectedParty.phone}</span>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <span className="text-slate-400">Select Party (Customer, Supplier, etc.)</span>
          )}
        </div>
        <ChevronDown className={`size-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[300px] max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {!isCreatingInline ? (
            <>
              {/* Search Bar */}
              <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                <div className="relative">
                  <Search className="size-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search party by name or phone..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Parties List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100" role="listbox">
                {filteredParties.length > 0 ? (
                  filteredParties.map((p) => {
                    const isSelected = p.id === value;
                    const balancePaise = getPartyBalance(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectParty(p.id)}
                        className={`w-full flex items-center justify-between p-2.5 text-left text-xs transition-colors cursor-pointer hover:bg-indigo-50/60 ${
                          isSelected ? 'bg-indigo-50/80 font-medium' : ''
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PartyAvatar name={p.name} size="sm" photoUrl={p.photoUrl} />
                          <div className="truncate">
                            <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                              <span className="font-medium text-slate-600">{p.relation}</span>
                              {p.phone && p.phone !== '—' && (
                                <>
                                  <span>•</span>
                                  <span>{p.phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          {balancePaise > 0 ? (
                            <div className="text-emerald-700 font-semibold font-mono text-[11px]">
                              ₹{(balancePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                              <div className="text-[9px] text-emerald-600 uppercase font-sans">To Receive</div>
                            </div>
                          ) : balancePaise < 0 ? (
                            <div className="text-rose-700 font-semibold font-mono text-[11px]">
                              ₹{(Math.abs(balancePaise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                              <div className="text-[9px] text-rose-600 uppercase font-sans">To Pay</div>
                            </div>
                          ) : (
                            <div className="text-slate-400 text-[10px] uppercase font-medium">Settled</div>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No matching party found for "{search}"
                  </div>
                )}
              </div>

              {/* Add New Party Action Button */}
              <div className="p-2 border-t border-slate-100 bg-slate-50">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingInline(true);
                    setNewName(search); // Prefill typed search query as new party name
                    setFormError(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>+ Add New Party</span>
                </button>
              </div>
            </>
          ) : (
            /* Inline Quick Creation Form */
            <form onSubmit={handleCreateNewParty} className="p-3 space-y-3 bg-white">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <UserPlus className="size-4 text-indigo-600" />
                  <span>Create New Party</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingInline(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              </div>

              {formError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <PartyAvatar
                  name={newName.trim() || 'New Party'}
                  photoUrl={newPhotoUrl}
                  size="lg"
                  editable
                  onPhotoChange={(url) => setNewPhotoUrl(url)}
                  onPhotoRemove={newPhotoUrl ? () => setNewPhotoUrl(undefined) : undefined}
                />
                <div className="text-[11px] text-slate-500">
                  <div className="font-semibold text-slate-800">Party Photo / Logo</div>
                  <span>Hover to upload photo or leave for auto-initials</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Party Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Rahul Sharma, Gupta Traders"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Relationship
                  </label>
                  <select
                    value={newRelation}
                    onChange={(e) => setNewRelation(e.target.value as PartyRelation)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-indigo-600"
                  >
                    <option value="Customer">Customer</option>
                    <option value="Supplier">Supplier</option>
                    <option value="Borrower">Borrower</option>
                    <option value="Lender">Lender</option>
                    <option value="Partner">Partner</option>
                    <option value="Employee">Employee</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingInline(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-2xs cursor-pointer"
                >
                  Save & Select
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
