import React, { useState, useRef, useEffect } from 'react';
import { useLedger } from '../../db/repository-context';
import { formatPaiseToInr } from '../../core/formatters/currency';
import { calculatePartyNetBalance } from '../../core/math/balance';
import { Button } from '../ui/Button';
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Download,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  CreditCard,
  Building2,
  Settings,
  Scale,
  Zap,
  CheckCircle2,
  User,
  SlidersHorizontal,
} from 'lucide-react';

export type GeminiModelId =
  | 'gemini-3.7-flash'
  | 'gemini-3.8-flash'
  | 'gemini-3.5-flash'
  | 'gemini-3.1-pro-preview'
  | 'gemini-3.1-flash-lite';

export type ChatbotRoleId = 'controller' | 'restructure' | 'cashflow' | 'credit' | 'fast' | 'custom';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  modelUsed?: string;
  roleUsed?: string;
}

const MODEL_OPTIONS: { id: GeminiModelId; label: string; tag: string; description: string }[] = [
  {
    id: 'gemini-3.7-flash',
    label: 'Gemini 3.7 Flash',
    tag: 'Flagship Hybrid',
    description: 'High-speed reasoning & multimodal financial intelligence (Recommended)',
  },
  {
    id: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro',
    tag: 'Complex Reasoning',
    description: 'Deep multi-year debt restructuring, forensic audit, & complex legal/tax analysis',
  },
  {
    id: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    tag: 'General Ledger',
    description: 'Balanced performance for standard ledger queries, balances, and reports',
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    tag: 'Ultra Fast',
    description: 'Sub-second arithmetic checks, currency conversions, and rapid lookups',
  },
  {
    id: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash',
    tag: 'Latest Flash',
    description: 'Next-gen flash throughput for high-volume enterprise financial workflows',
  },
];

const ROLE_OPTIONS: {
  id: ChatbotRoleId;
  label: string;
  icon: React.ReactNode;
  tagline: string;
  description: string;
}[] = [
  {
    id: 'controller',
    label: 'Chief Financial Controller',
    icon: <Scale className="w-4 h-4 text-indigo-400" />,
    tagline: 'Ledger Audit & Split Parity',
    description: 'Enforces mathematical invariance, double-entry checks, and audit compliance.',
  },
  {
    id: 'restructure',
    label: 'Debt Workout & EMI Strategist',
    icon: <CreditCard className="w-4 h-4 text-emerald-400" />,
    tagline: 'Restructuring & Recovery',
    description: 'Advises on delinquent accounts, amortization schedules, and settlement negotiations.',
  },
  {
    id: 'cashflow',
    label: 'Cash Flow & Liquidity Analyst',
    icon: <TrendingUp className="w-4 h-4 text-cyan-400" />,
    tagline: 'Working Capital & Runway',
    description: 'Forecasts cash runway, collection turnaround, and seasonal liquidity gaps.',
  },
  {
    id: 'credit',
    label: 'Counterparty Risk Evaluator',
    icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
    tagline: 'Credit Risk & Trust Scoring',
    description: 'Analyzes debtor exposure limits, overdue concentration, and counterparty health.',
  },
  {
    id: 'fast',
    label: 'Instant Bookkeeper & Arithmetic',
    icon: <Zap className="w-4 h-4 text-yellow-400" />,
    tagline: 'Rapid Lookup & Conversion',
    description: 'Ultra-fast concise calculations, paise to INR conversions, and quick ledger lookups.',
  },
  {
    id: 'custom',
    label: 'Custom AI Persona',
    icon: <Settings className="w-4 h-4 text-purple-400" />,
    tagline: 'Configurable System Prompt',
    description: 'Define your own enterprise instructions and custom business constraints.',
  },
];

const SUGGESTED_PROMPTS = [
  {
    title: 'Portfolio Audit',
    text: 'Execute a comprehensive audit of current receivables versus payables. Identify our top 3 highest-risk counterparty exposures.',
    role: 'controller' as ChatbotRoleId,
  },
  {
    title: 'Debt Restructuring Strategy',
    text: 'Analyze all active EMI plans and overdue counterparties. Propose a 6-month restructuring plan to accelerate debt recovery.',
    role: 'restructure' as ChatbotRoleId,
  },
  {
    title: '30-Day Liquidity Forecast',
    text: 'Based on our net liquidity, pending recurring schedules, and upcoming receivables, forecast our 30-day working capital buffer.',
    role: 'cashflow' as ChatbotRoleId,
  },
  {
    title: 'Formal Payment Reminder',
    text: 'Draft an institutional, formal corporate payment notice for overdue debtor accounts with specific rupee balances and settlement terms.',
    role: 'credit' as ChatbotRoleId,
  },
  {
    title: 'Split Parity Check',
    text: 'Verify mathematical invariance across recent ledger splits and confirm zero floating-point discrepancies.',
    role: 'fast' as ChatbotRoleId,
  },
];

export const GeminiChatView: React.FC = () => {
  const { parties, transactions, emiPlans, recurringSchedules, telemetry } = useLedger();

  // Model & Role State
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>('gemini-3.7-flash');
  const [selectedRole, setSelectedRole] = useState<ChatbotRoleId>('controller');
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>(
    'You are a bespoke institutional financial strategist for raBooks by Rustam. Adhere to integer paise precision and formal corporate English.'
  );
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: `### Executive Financial Core Copilot Initialized
Good day. I am your **Gemini AI Financial Copilot** for **raBooks by Rustam**.

I am grounded in your live institutional ledger telemetry:
- **Net Liquidity:** ${formatPaiseToInr(telemetry.netLiquidityPaise)}
- **Total Receivables:** ${formatPaiseToInr(telemetry.totalReceivablesPaise)}
- **Total Payables:** ${formatPaiseToInr(telemetry.totalPayablesPaise)}
- **Active Counterparties:** ${telemetry.activePartiesCount} accounts
- **Active Loans & EMI Plans:** ${emiPlans.filter((e) => e.status === 'Active').length} active

Select a specialized model role or ask any question regarding liquidity, risk exposure, mathematical split parity, or restructuring strategies.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.7-flash',
      roleUsed: 'controller',
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const newUserMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputPrompt('');
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // Build conversation history array for multi-turn Gemini API
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          history: conversationHistory,
          model: selectedModel,
          role: selectedRole,
          systemInstruction: selectedRole === 'custom' ? customSystemPrompt : undefined,
          context: {
            totalReceivablesPaise: telemetry.totalReceivablesPaise,
            totalPayablesPaise: telemetry.totalPayablesPaise,
            netLiquidityPaise: telemetry.netLiquidityPaise,
            parties: parties.map((p) => {
              const partyTxns = transactions.filter((t) => t.partyId === p.id);
              const partyBalance = calculatePartyNetBalance(partyTxns);
              return {
                id: p.id,
                name: p.name,
                relation: p.relation,
                phone: p.phone,
                balancePaise: partyBalance.netBalancePaise,
                overdue: p.overdue,
                trustScore: p.trustScore,
              };
            }),
            emiPlans: emiPlans.map((e) => ({
              id: e.id,
              title: e.title,
              partyId: e.partyId,
              principalPaise: e.totalPrincipalPaise,
              status: e.status,
            })),
            recurringSchedules: recurringSchedules.map((r) => ({
              id: r.id,
              title: r.title,
              amountPaise: r.totalAmountPaise,
              frequency: r.frequency,
              status: r.status,
            })),
            transactions: transactions.slice(0, 15),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to receive response from Gemini Copilot.');
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.text || 'No response returned from model.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed || selectedModel,
        roleUsed: selectedRole,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with Gemini Copilot server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleClearHistory = () => {
    if (window.confirm('Reset conversation thread and clear conversation memory?')) {
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          text: `### Conversation Thread Reset
Memory cleared. Ready for new multi-turn instructions under **${
            ROLE_OPTIONS.find((r) => r.id === selectedRole)?.label
          }** mode using **${selectedModel}**.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: selectedModel,
          roleUsed: selectedRole,
        },
      ]);
    }
  };

  const handleExportTranscript = () => {
    const transcript = messages
      .map(
        (m) =>
          `[${m.timestamp}] ${m.role === 'user' ? 'USER' : `GEMINI (${m.modelUsed || selectedModel})`}:\n${
            m.text
          }\n`
      )
      .join('\n---\n\n');

    const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rabooks-ai-transcript-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentRoleObj = ROLE_OPTIONS.find((r) => r.id === selectedRole) || ROLE_OPTIONS[0];

  return (
    <div className="space-y-4">
      {/* Top Header & Telemetry Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-600 via-violet-600 to-amber-400 flex items-center justify-center text-white shadow-inner">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Gemini Executive AI Copilot
                </h1>
                <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Multi-Turn Chat
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Grounding in institutional double-entry stores, integer paise invariants, and risk telemetry
              </p>
            </div>
          </div>

          {/* Quick HUD Metrics */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-xl">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Net Liquidity</div>
              <div className="font-mono font-bold text-emerald-400">
                {formatPaiseToInr(telemetry.netLiquidityPaise)}
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-xl">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Receivables</div>
              <div className="font-mono font-bold text-blue-400">
                {formatPaiseToInr(telemetry.totalReceivablesPaise)}
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-xl">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Payables</div>
              <div className="font-mono font-bold text-rose-400">
                {formatPaiseToInr(telemetry.totalPayablesPaise)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Configure Model & Persona"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Persona & Model Control Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Active Persona Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              Role:
            </span>
            {ROLE_OPTIONS.map((role) => {
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                      : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title={role.description}
                >
                  {role.icon}
                  <span>{role.label}</span>
                </button>
              );
            })}
          </div>

          {/* Model Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Model:
            </span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as GeminiModelId)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono cursor-pointer"
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.tag})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Settings Drawer (if expanded) */}
      {showSettingsDrawer && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Advanced AI Configuration & Custom System Instructions
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowSettingsDrawer(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Active Persona: <span className="text-indigo-600">{currentRoleObj.label}</span>
              </label>
              <p className="text-slate-500 text-[11px] mb-2">{currentRoleObj.description}</p>
              {selectedRole === 'custom' && (
                <textarea
                  rows={3}
                  value={customSystemPrompt}
                  onChange={(e) => setCustomSystemPrompt(e.target.value)}
                  placeholder="Enter custom enterprise instructions for the Gemini agent..."
                  className="w-full text-xs text-slate-900 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="block font-semibold text-slate-700">Model Capabilities</label>
              <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div>
                  • <strong>gemini-3.1-pro-preview:</strong> Complex reasoning, deep debt restructuring & forensic auditing.
                </div>
                <div>
                  • <strong>gemini-3.7-flash / gemini-3.5-flash:</strong> General ledger tasks, balancing, and reports.
                </div>
                <div>
                  • <strong>gemini-3.1-flash-lite:</strong> High-throughput instant lookups and arithmetic checks.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Interface Box */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[650px] overflow-hidden">
        {/* Chat Actions Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-700">
              Active Thread ({messages.length} messages)
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 font-mono text-[11px]">{selectedModel}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportTranscript}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Export Chat
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
            >
              Reset Thread
            </Button>
          </div>
        </div>

        {/* Scrollable Message Thread */}
        <div className="grow overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => {
            const isAssistant = msg.role === 'assistant';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${
                  isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                    isAssistant
                      ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  {isAssistant ? (
                    <Bot className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`flex flex-col ${
                    isAssistant ? 'items-start' : 'items-end'
                  } max-w-[88%]`}
                >
                  <div
                    className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isAssistant
                        ? 'bg-slate-50 border border-slate-200 text-slate-900 shadow-2xs rounded-tl-xs'
                        : 'bg-indigo-600 text-white rounded-tr-xs shadow-xs'
                    }`}
                  >
                    {/* Render message with structured markdown styling */}
                    <div className="whitespace-pre-wrap font-sans space-y-2">
                      {msg.text}
                    </div>

                    {/* Footer Info & Copy Action */}
                    <div
                      className={`mt-2 pt-2 border-t flex items-center justify-between gap-3 text-[10px] ${
                        isAssistant
                          ? 'border-slate-200/80 text-slate-400'
                          : 'border-indigo-500/60 text-indigo-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-mono">
                        <span>{msg.timestamp}</span>
                        {msg.modelUsed && (
                          <>
                            <span>•</span>
                            <span className="font-semibold">{msg.modelUsed}</span>
                          </>
                        )}
                      </div>

                      {isAssistant && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.id, msg.text)}
                          className="hover:text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Copy message"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600 font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 mr-auto max-w-lg">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 text-slate-700 p-3.5 rounded-2xl rounded-tl-xs flex items-center gap-2.5 text-xs shadow-2xs">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span className="font-medium">
                  {selectedModel === 'gemini-3.1-pro-preview'
                    ? 'Gemini 3.1 Pro conducting deep reasoning & mathematical verification...'
                    : 'Gemini AI generating multi-turn ledger analysis...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-600 hover:text-rose-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Suggested Starter Prompts */}
        <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Starters:
          </span>
          {SUGGESTED_PROMPTS.map((starter, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedRole(starter.role);
                handleSendMessage(starter.text);
              }}
              disabled={isLoading}
              className="text-[11px] bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-700 px-3 py-1 rounded-full border border-slate-200 transition-all shrink-0 cursor-pointer disabled:opacity-50"
            >
              {starter.title}
            </button>
          ))}
        </div>

        {/* Input Form Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative grow">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Ask ${currentRoleObj.label} about ledger balances, cashflow, debt restructuring, or split parity...`}
                className="w-full text-xs sm:text-sm text-slate-900 border border-slate-300 rounded-xl px-4 py-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none placeholder:text-slate-400"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !inputPrompt.trim()}
              icon={
                isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )
              }
            >
              Send
            </Button>
          </form>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>raBooks v4.0 • Zero Floating-Point Precision Guaranteed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
