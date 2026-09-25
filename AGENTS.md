# AGENTS.md — Autonomous Coding Agent Operating Governance
System: raBooks Autonomous Engineering System (AES)
Target: AI Coding Agents (Antigravity, Cursor Composer, Windsurf Cascade, Claude Code, GitHub Copilot)

## 1. Safety Guards & Inviolable Directives
1. Zero Floating-Point Math: Always calculate money in integer base units (cents or paise, ₹1.00 = 100 paise).
2. Split Reconciliation: Always ensure totalAmountPaise - sum(splits.amountPaise) === 0.
3. Dual-ID Decoupling: Never use payment reference numbers (UTRs) as internal keys ('RB-TXN-XXXXXX' vs UTR/Cheque).
4. Zero-Placeholder Mandate: Output complete, syntactically valid files without skipping lines.
5. Corporate Standard: Maintain 100% formal corporate English across all strings.
6. Print Spooler: Always invoke the native print dialog rather than forcing PDF downloads.
7. Local-First Autonomy: Browser-resident IndexedDB (raBooks_DB_v3) acts as the local source of truth (<16ms updates).
8. Audit Trail: Every state mutation logged to audit_log with actor, action, target entity, and timestamp.

## 2. The 4-Tier Memory Working Protocol
* Tier 1 (Ephemeral Session): Immediate developer prompt context.
* Tier 2 (Working Memory Scratchpad): '.agent-scratchpad.md' at repository root.
* Tier 3 (Architectural Ground Truth): PRD and this governance manual.
* Tier 4 (Canonical Ledger State): TypeScript schemas in '@rabooks/core-engine'.
