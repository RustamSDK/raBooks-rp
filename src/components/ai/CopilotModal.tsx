import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useLedger } from '../../db/repository-context';
import { formatPaiseToInr } from '../../core/formatters/currency';
import { CanonicalTransaction, MovementType, PaymentRail } from '../../core/models/transaction';
import {
  Sparkles,
  Bot,
  ShieldAlert,
  Send,
  Loader2,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

interface CopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTransactionWithParsed?: (parsed: Partial<CanonicalTransaction>) => void;
}

export const CopilotModal: React.FC<CopilotModalProps> = ({
  isOpen,
  onClose,
  onOpenTransactionWithParsed,
}) => {
  const { parties, transactions, emiPlans, telemetry, recordTransaction, tenantId } = useLedger();

  const [activeTab, setActiveTab] = useState<'magic-entry' | 'chat' | 'audit'>('magic-entry');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Magic Entry parsed result
  const [parsedResult, setParsedResult] = useState<any | null>(null);
  const [commitSuccess, setCommitSuccess] = useState(false);

  // Chat conversation state
  const [selectedChatModel, setSelectedChatModel] = useState<string>('gemini-3.7-flash');
  const [selectedChatRole, setSelectedChatRole] = useState<string>('controller');
  const [chatHistory, setChatHistory] = useState<
    { role: 'user' | 'assistant'; text: string; time: string; modelUsed?: string }[]
  >([
    {
      role: 'assistant',
      text: 'Good day. I am your raBooks Executive Ledger Copilot powered by Gemini. You can ask for real-time portfolio analysis, exposure risks, counterparty balances, or debt restructuring telemetry across multiple turns.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.7-flash',
    },
  ]);

  // Audit report
  const [auditReport, setAuditReport] = useState<string | null>(null);

  const handleMagicEntrySubmit = async (textToParse?: string) => {
    const query = textToParse || inputText;
    if (!query.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setParsedResult(null);
    setCommitSuccess(false);

    try {
      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'magic-entry',
          text: query,
          context: {
            partyNames: parties.map((p) => p.name),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process natural language entry.');
      }

      setParsedResult(data.result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing Gemini Magic Entry parser.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommitParsedEntry = async () => {
    if (!parsedResult) return;

    try {
      setIsLoading(true);
      // Match or find party
      let party = parties.find(
        (p) => p.name.toLowerCase() === (parsedResult.partyName || '').toLowerCase()
      );

      // If not exact match, check fuzzy
      if (!party) {
        party = parties.find((p) =>
          p.name.toLowerCase().includes((parsedResult.partyName || '').toLowerCase())
        );
      }

      const partyId = party ? party.id : parties[0]?.id || 'pty-unknown';

      const canonicalTxn: CanonicalTransaction = {
        id: `RB-TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        tenantId,
        partyId,
        type: (parsedResult.movementType as MovementType) || 'GIVEN',
        totalAmountPaise: parsedResult.totalAmountPaise || 0,
        date: new Date().toISOString().split('T')[0],
        notes: `${parsedResult.notes || 'Natural language entry'} [AI-Parsed]`,
        status: 'Confirmed',
        splits: (parsedResult.splits || []).map((s: any, idx: number) => ({
          id: `spl-${Date.now()}-${idx}`,
          method: (s.method as PaymentRail) || 'UPI',
          amountPaise: s.amountPaise,
          paymentReferenceId: s.paymentReferenceId || undefined,
          initiatedBy: parsedResult.movementType === 'GIVEN' ? 'Lender' : 'Debtor',
          confirmed: true,
        })),
        createdAt: new Date().toISOString(),
        createdBy: 'gemini-copilot@rabooks.internal',
      };

      await recordTransaction(canonicalTxn);
      setCommitSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to commit transaction.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userText = inputText.trim();
    setInputText('');

    const newHistory = [
      ...chatHistory,
      {
        role: 'user' as const,
        text: userText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setChatHistory(newHistory);

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: chatHistory.map((m) => ({ role: m.role, text: m.text })),
          model: selectedChatModel,
          role: selectedChatRole,
          context: {
            totalReceivablesPaise: telemetry.totalReceivablesPaise,
            totalPayablesPaise: telemetry.totalPayablesPaise,
            netLiquidityPaise: telemetry.netLiquidityPaise,
            parties: parties.map((p) => ({
              name: p.name,
              relation: p.relation,
              phone: p.phone,
              overdue: p.overdue,
              trustScore: p.trustScore,
            })),
            emiPlans: emiPlans.map((e) => ({
              id: e.id,
              title: e.title,
              principalPaise: e.totalPrincipalPaise,
              status: e.status,
            })),
            transactions: transactions.slice(0, 10),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer from copilot.');
      }

      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.text || 'No response returned.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: data.modelUsed || selectedChatModel,
        },
      ]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Chat copilot error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAudit = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setAuditReport(null);

    try {
      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'audit',
          text: 'Execute complete transactional audit on recent ledger batches.',
          context: {
            transactions: transactions.slice(0, 20),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate audit report.');
      }

      setAuditReport(data.report || 'No anomalies detected.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Audit scan error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gemini AI Ledger Copilot"
      subtitle="Server-side Gemini 3 Flash natural-language extraction & portfolio intelligence"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Mode Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('magic-entry')}
            className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'magic-entry'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Magic Entry (NLP Parser)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-indigo-600" />
            <span>Executive Q&A</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('audit');
              if (!auditReport) handleRunAudit();
            }}
            className={`flex items-center gap-1.5 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
            <span>Audit Anomaly Scan</span>
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab 1: Magic Entry */}
        {activeTab === 'magic-entry' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enter Commercial Narration in Natural Language
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="e.g. Disbursed ₹45,000 to Sharma Steel via UPI 25000 UTR998124 and Cash 20000 for scrap metal advance"
                  className="w-full text-xs text-slate-900 border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Sample Quick Prompts */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[11px] text-slate-400 py-0.5">Quick Tests:</span>
                {[
                  'Disbursed ₹50,000 to Sharma Steel Works via UPI 30,000 ref UTR881920 and Cash 20,000 for lathe spares',
                  'Collected 75,000 from Mehta Textiles Syndicate via Bank NEFT-AXIS99120 for export batch',
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(sample);
                      handleMagicEntrySubmit(sample);
                    }}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    Sample #{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="primary"
                onClick={() => handleMagicEntrySubmit()}
                disabled={isLoading || !inputText.trim()}
                icon={
                  isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )
                }
              >
                {isLoading ? 'Parsing with Gemini 3 Flash...' : 'Extract & Parse Entry'}
              </Button>
            </div>

            {/* Parsed Result Preview */}
            {parsedResult && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-slate-900">
                      Structured Invariant-Checked Extraction
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                    {parsedResult.movementType}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Party:</span>{' '}
                    <span className="font-semibold text-slate-900">{parsedResult.partyName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total:</span>{' '}
                    <span className="font-mono font-bold text-slate-900">
                      {formatPaiseToInr(parsedResult.totalAmountPaise || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Integer Base:</span>{' '}
                    <span className="font-mono text-slate-700">
                      {(parsedResult.totalAmountPaise || 0).toLocaleString()} paise
                    </span>
                  </div>
                </div>

                {parsedResult.splits && parsedResult.splits.length > 0 && (
                  <div className="border-t border-slate-200 pt-2 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-700">
                      Rail Split Reconciliation:
                    </span>
                    <div className="space-y-1 font-mono text-xs tabular-nums">
                      {parsedResult.splits.map((s: any, i: number) => (
                        <div
                          key={i}
                          className="flex justify-between bg-white px-2.5 py-1.5 rounded border border-slate-200"
                        >
                          <span>
                            {s.method} Rail {s.paymentReferenceId ? `[Ref: ${s.paymentReferenceId}]` : ''}
                          </span>
                          <span className="font-semibold">{formatPaiseToInr(s.amountPaise)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                  <span className="font-semibold text-slate-700">Notes:</span>{' '}
                  {parsedResult.notes || 'N/A'}
                </div>

                {commitSuccess ? (
                  <div className="bg-emerald-50 text-emerald-800 text-xs font-semibold p-2.5 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Transaction successfully committed to ACID ledger!</span>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="success"
                      onClick={handleCommitParsedEntry}
                      disabled={isLoading}
                      icon={<ArrowRight className="w-4 h-4" />}
                    >
                      Commit Directly to Ledger
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Executive Multi-Turn Q&A */}
        {activeTab === 'chat' && (
          <div className="space-y-3">
            {/* Quick Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Role:</span>
                <select
                  value={selectedChatRole}
                  onChange={(e) => setSelectedChatRole(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-800 text-xs rounded-md px-2 py-1 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="controller">Chief Financial Controller</option>
                  <option value="restructure">Debt Restructuring & EMI Strategist</option>
                  <option value="cashflow">Cash Flow & Liquidity Analyst</option>
                  <option value="credit">Counterparty Credit Evaluator</option>
                  <option value="fast">Instant Bookkeeper & Arithmetic</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Model:</span>
                <select
                  value={selectedChatModel}
                  onChange={(e) => setSelectedChatModel(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-800 text-xs rounded-md px-2 py-1 font-mono text-[11px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash (Hybrid)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep Reasoning)</option>
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (General)</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Fast)</option>
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 h-80 overflow-y-auto space-y-3">
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-br-2xs shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-900 shadow-2xs rounded-bl-2xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    <div
                      className={`text-[9px] mt-1.5 flex items-center justify-between gap-2 ${
                        msg.role === 'user' ? 'text-slate-400' : 'text-slate-400'
                      }`}
                    >
                      <span>{msg.time}</span>
                      {msg.modelUsed && <span className="font-mono">{msg.modelUsed}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200 w-fit shadow-2xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>
                    {selectedChatModel === 'gemini-3.1-pro-preview'
                      ? 'Gemini 3.1 Pro executing deep reasoning verification...'
                      : 'Gemini AI synthesizing multi-turn response...'}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Ask ${selectedChatRole} about liquidity, debt restructuring, or split parity...`}
                className="grow text-xs text-slate-900 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || !inputText.trim()}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                Send
              </Button>
            </form>
          </div>
        )}

        {/* Tab 3: Audit Anomaly Scan */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-600">
                Automated compliance check for split parity, UTR presence, and concentration exposure.
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRunAudit}
                disabled={isLoading}
                icon={
                  isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5" />
                  )
                }
              >
                Re-Run Scan
              </Button>
            </div>

            {isLoading && (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                <div>Conducting Chief Auditor compliance scan across transactions...</div>
              </div>
            )}

            {auditReport && !isLoading && (
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                {auditReport}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
