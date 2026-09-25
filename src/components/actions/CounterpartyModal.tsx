import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PartyAvatar } from '../ui/PartyAvatar';
import { useLedger } from '../../db/repository-context';
import { CounterpartyEntity, PartyRelation, TrustScore } from '../../core/models/counterparty';
import { optimizePartyImageFile } from '../../core/utils/imageOptimizer';
import {
  Building2,
  UserPlus,
  AlertCircle,
  Camera,
  Trash2,
  Upload,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface CounterpartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyToEdit?: CounterpartyEntity | null;
}

export const CounterpartyModal: React.FC<CounterpartyModalProps> = ({
  isOpen,
  onClose,
  partyToEdit,
}) => {
  const { saveParty, tenantId } = useLedger();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [relation, setRelation] = useState<PartyRelation>('Customer');
  const [ratePercentMonthly, setRatePercentMonthly] = useState<string>('0.00');
  const [trustScore, setTrustScore] = useState<TrustScore>('green');
  const [overdue, setOverdue] = useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (partyToEdit) {
        setName(partyToEdit.name);
        setPhone(partyToEdit.phone);
        setEmail(partyToEdit.email || '');
        setUpiId(partyToEdit.upiId || '');
        setRelation(partyToEdit.relation);
        setRatePercentMonthly(partyToEdit.ratePercentMonthly.toFixed(2));
        setTrustScore(partyToEdit.trustScore);
        setOverdue(partyToEdit.overdue);
        setPhotoUrl(partyToEdit.photoUrl || undefined);
      } else {
        setName('');
        setPhone('');
        setEmail('');
        setUpiId('');
        setRelation('Customer');
        setRatePercentMonthly('1.25');
        setTrustScore('green');
        setOverdue(false);
        setPhotoUrl(undefined);
      }
      setErrorMsg(null);
      setIsProcessingImage(false);
    }
  }, [isOpen, partyToEdit]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setErrorMsg(null);
    setIsProcessingImage(true);

    try {
      const optimized = await optimizePartyImageFile(file, {
        maxDimension: 384,
        maxSizeBytes: 5 * 1024 * 1024,
      });
      setPhotoUrl(optimized);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to process selected profile photo.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Legal counterparty entity name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Contact mobile/phone number is required for notification dispatch.');
      return;
    }

    const rate = parseFloat(ratePercentMonthly) || 0;

    const party: CounterpartyEntity = {
      id: partyToEdit?.id || `pty-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      tenantId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      upiId: upiId.trim() || undefined,
      photoUrl: photoUrl || undefined,
      relation,
      ratePercentMonthly: rate,
      trustScore,
      overdue,
      createdAt: partyToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveParty(party);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save counterparty entity.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={partyToEdit ? 'Edit Party Details' : 'Add New Party'}
      subtitle="Customer, supplier, borrower, lender, or partner profile"
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            icon={partyToEdit ? undefined : <UserPlus className="size-4" />}
          >
            {partyToEdit ? 'Save Changes' : 'Save Party'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Party Avatar / Logo Upload Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFileChange}
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            aria-label="Upload profile image or company logo"
          />

          <div className="relative shrink-0">
            <PartyAvatar
              name={name.trim() || 'New Party'}
              photoUrl={photoUrl}
              size="2xl"
              editable
              onPhotoChange={(newUrl) => setPhotoUrl(newUrl)}
              onPhotoRemove={photoUrl ? handleRemovePhoto : undefined}
            />
          </div>

          <div className="grow text-center sm:text-left space-y-1.5">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-xs font-bold text-slate-900">
                Party Profile Photo / Entity Logo
              </span>
              {photoUrl && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="size-3" />
                  Custom Avatar
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Upload an actual photo or company insignia. If no image is provided, deterministic initials (e.g.{' '}
              <span className="font-semibold text-slate-700">
                {name.trim() ? (name.trim().split(/\s+/).length > 1 ? `${name.trim().split(/\s+/)[0][0]}${name.trim().split(/\s+/)[1][0]}`.toUpperCase() : name.trim().slice(0, 2).toUpperCase()) : 'NP'}
              </span>
              ) are rendered across all ledgers.
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImage}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 active:bg-indigo-100 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {photoUrl ? <Camera className="size-3.5" /> : <Upload className="size-3.5" />}
                <span>{photoUrl ? 'Change Photo' : 'Upload Image'}</span>
              </button>

              {photoUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 active:bg-rose-100 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <Input
          label="Party / Business Name"
          placeholder="e.g. Rahul Sharma, Gupta Traders, Apex Logistics"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Mobile Phone / Contact Number"
            placeholder="+91 98201 44892"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <Input
            label="Official Billing Email (Optional)"
            type="email"
            placeholder="finance@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Default UPI ID / VPA (Optional)"
            placeholder="entity@bankname"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Institutional Relationship
            </label>
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value as PartyRelation)}
              className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="Customer">Customer (Trade Debtor)</option>
              <option value="Supplier">Supplier (Trade Creditor)</option>
              <option value="Borrower">Borrower (Financing)</option>
              <option value="Partner">Partner (Corridor Associate)</option>
              <option value="Lender">Lender (Capital Provider)</option>
              <option value="Employee">Employee (Internal Staff)</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Accrual Yield Rate (% per month)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                min="0"
                max="10"
                value={ratePercentMonthly}
                onChange={(e) => setRatePercentMonthly(e.target.value)}
                className="w-full pr-8 pl-3 py-2 text-xs font-mono text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400 font-mono">
                % / mo
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Risk & Trust Score
            </label>
            <select
              value={trustScore}
              onChange={(e) => setTrustScore(e.target.value as TrustScore)}
              className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="green">Tier A (Low Risk - Green)</option>
              <option value="amber">Tier B (Moderate Risk - Amber)</option>
              <option value="red">Tier C (High Risk / Watchlist - Red)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="overdue-toggle"
            checked={overdue}
            onChange={(e) => setOverdue(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
          />
          <label htmlFor="overdue-toggle" className="text-xs text-slate-700 select-none cursor-pointer">
            Mark entity account as having overdue past obligations
          </label>
        </div>
      </form>
    </Modal>
  );
};
