import React from 'react';
import { Menu, Sparkles, Shield, Clock, HardDrive } from 'lucide-react';
import { NavigationTab } from './Sidebar';
import { useLedger } from '../../db/repository-context';

interface HeaderProps {
  currentTab: NavigationTab;
  onOpenMobileSidebar: () => void;
  onOpenCopilot: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileSidebar,
  onOpenCopilot,
}) => {
  const { tenantId, activeDriver } = useLedger();

  const titleMap: Record<NavigationTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Financial Ledger',
      subtitle: 'Party-wise transaction history, receivables, and payables',
    },
    parties: {
      title: 'Parties & Accounts',
      subtitle: 'Customers, suppliers, borrowers, and lenders with current balances',
    },
    emi: {
      title: 'Loans & EMI Plans',
      subtitle: 'Monthly repayment schedules and installment tracking',
    },
    recurring: {
      title: 'Recurring Schedules',
      subtitle: 'Automatic daily, weekly, and monthly transaction entries',
    },
    'ai-chat': {
      title: 'AI Ledger Advisor',
      subtitle: 'Multi-turn intelligent analysis, restructuring strategy, and risk assessment powered by Gemini',
    },
    admin: {
      title: 'Backup & Settings',
      subtitle: 'Encrypted cold storage backups and audit log',
    },
  };

  const currentInfo = titleMap[currentTab] || titleMap.dashboard;

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Open navigation menu"
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </button>

          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight text-balance">
              {currentInfo.title}
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block text-pretty">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Status Pill & Copilot Button */}
        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-700">
            <span className="size-2 rounded-full bg-emerald-500"></span>
            <span className="font-medium">raBooks Active</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">Local-First</span>
          </div>

          <button
            type="button"
            onClick={onOpenCopilot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Launch Gemini AI Ledger Assistant"
            aria-label="Launch Gemini AI Ledger Assistant"
          >
            <Sparkles className="size-3.5 text-amber-300" />
            <span className="hidden sm:inline">AI Copilot</span>
          </button>
        </div>
      </div>
    </header>
  );
};
