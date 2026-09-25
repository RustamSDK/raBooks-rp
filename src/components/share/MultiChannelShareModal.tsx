import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useLedger } from '../../db/repository-context';
import { formatPaiseToInr } from '../../core/formatters/currency';
import { Share2, Copy, Check, MessageSquare, Send, Mail } from 'lucide-react';

interface MultiChannelShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPartyId?: string;
}

export const MultiChannelShareModal: React.FC<MultiChannelShareModalProps> = ({
  isOpen,
  onClose,
  defaultPartyId,
}) => {
  const { parties, transactions, telemetry, getPartyBalance } = useLedger();
  const [selectedPartyId, setSelectedPartyId] = useState<string>(defaultPartyId || 'ALL');
  const [copied, setCopied] = useState(false);

  // Generate clean corporate text statement
  const generateStatementText = (): string => {
    const isSingleParty = selectedPartyId !== 'ALL';
    const party = parties.find((p) => p.id === selectedPartyId);

    const filteredTxns = isSingleParty
      ? transactions.filter((t) => t.partyId === selectedPartyId)
      : transactions.slice(0, 15);

    let text = `========================================\n`;
    text += `*raBooks Account Statement*\n`;
    text += `Generated: ${new Date().toLocaleString('en-IN')}\n`;
    text += `========================================\n\n`;

    if (isSingleParty && party) {
      const balance = getPartyBalance(party.id);
      text += `Party: ${party.name}\n`;
      text += `Phone: ${party.phone}\n`;
      text += `Relation: ${party.relation}\n`;
      text += `Current Balance: ${formatPaiseToInr(Math.abs(balance))} (${balance > 0 ? 'Receivable (To Collect)' : balance < 0 ? 'Payable (To Pay)' : 'Settled'})\n\n`;
    } else {
      text += `*Overview*\n`;
      text += `Total to Receive: ${formatPaiseToInr(telemetry.totalReceivablesPaise)}\n`;
      text += `Total to Pay: ${formatPaiseToInr(telemetry.totalPayablesPaise)}\n`;
      text += `Net Balance: ${formatPaiseToInr(Math.abs(telemetry.netLiquidityPaise))}\n\n`;
    }

    text += `*Recent Transactions*\n`;
    text += `----------------------------------------\n`;

    filteredTxns.forEach((t) => {
      const partyObj = parties.find((p) => p.id === t.partyId);
      const splitStr = t.splits.map((s) => `${s.method}${s.paymentReferenceId ? ` [${s.paymentReferenceId}]` : ''}`).join(', ');
      text += `• ${t.date} | ${t.id}\n`;
      text += `  ${t.type === 'GIVEN' ? 'Given / Paid 🔴' : 'Taken / Received 🟢'}: ${formatPaiseToInr(t.totalAmountPaise)}\n`;
      if (!isSingleParty) text += `  Party: ${partyObj?.name || 'Unknown'}\n`;
      text += `  Rail: ${splitStr}\n`;
      text += `  Ref: ${t.notes}\n\n`;
    });

    text += `----------------------------------------\n`;
    text += `Verified under raBooks Invariant Engine v4.0\n`;
    text += `Direct queries: finance@rabooks.internal\n`;

    return text;
  };

  const handleCopyClipboard = async () => {
    const text = generateStatementText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = generateStatementText();
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleTelegramShare = () => {
    const text = generateStatementText();
    const encoded = encodeURIComponent(text);
    window.open(`https://t.me/share/url?text=${encoded}&url=`, '_blank');
  };

  const handleEmailShare = () => {
    const text = generateStatementText();
    const subject = encodeURIComponent('raBooks Formal Statement of Account');
    const body = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleWebShare = async () => {
    const text = generateStatementText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'raBooks Statement of Account',
          text,
        });
      } catch {
        // User cancelled or unsupported
      }
    } else {
      handleCopyClipboard();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Multi-Channel Financial Statement Dispatch"
      subtitle="Dispatch cryptographically formatted statement summaries across institutional channels"
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyClipboard}
            icon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Copied to Clipboard' : 'Copy Plaintext'}
          </Button>
          <Button type="button" variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Counterparty filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Statement Scope / Target Counterparty
          </label>
          <select
            value={selectedPartyId}
            onChange={(e) => setSelectedPartyId(e.target.value)}
            className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="ALL">Entire Enterprise Ledger Snapshot (All Counterparties)</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({formatPaiseToInr(getPartyBalance(p.id))})
              </option>
            ))}
          </select>
        </div>

        {/* Channel Dispatch Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-800 text-xs font-medium transition-all gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleTelegramShare}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-sky-200 bg-sky-50/60 hover:bg-sky-100/60 text-sky-800 text-xs font-medium transition-all gap-1.5 cursor-pointer"
          >
            <Send className="w-5 h-5 text-sky-600" />
            <span>Telegram</span>
          </button>

          <button
            type="button"
            onClick={handleEmailShare}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-medium transition-all gap-1.5 cursor-pointer"
          >
            <Mail className="w-5 h-5 text-slate-600" />
            <span>Official Email</span>
          </button>

          <button
            type="button"
            onClick={handleWebShare}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/60 text-indigo-800 text-xs font-medium transition-all gap-1.5 cursor-pointer"
          >
            <Share2 className="w-5 h-5 text-indigo-600" />
            <span>Native Share</span>
          </button>
        </div>

        {/* Live Preview Box */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Dispatch Payload Preview
          </label>
          <pre className="w-full bg-slate-900 text-slate-100 text-[11px] font-mono p-3.5 rounded-xl max-h-56 overflow-y-auto whitespace-pre-wrap select-all leading-relaxed">
            {generateStatementText()}
          </pre>
        </div>
      </div>
    </Modal>
  );
};
