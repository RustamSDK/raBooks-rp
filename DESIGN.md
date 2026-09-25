# DESIGN.md — raBooks Design System & Engineering Specifications
Governed by: `ui-skills` & `AGENTS.md` Invariants
Design Language: Quiet, Editorial, High-Precision Financial Ledger

## 1. Color System & Semantic Intent

### Surface & Background Tokens
- `page-default`: `#F8FAFC` (slate-50) — Calm, glare-free ledger canvas
- `surface-default`: `#FFFFFF` — High-contrast, clean white data cards
- `surface-subtle`: `#F1F5F9` (slate-100) — Table headers, secondary toolbars
- `border-default`: `#E2E8F0` (slate-200) — Restrained, hair-line dividers
- `border-subtle`: `#F1F5F9` (slate-100) — Subtle internal row separators

### Financial Direction & Cashflow Semantics
- **TAKE (Collection / Repayment Received / Cash Inflow)**:
  - Background: `bg-emerald-50`
  - Text: `text-emerald-800`
  - Border: `border-emerald-200`
  - Directional Icon: `ArrowDownLeft` (Cash into treasury)
  - Semantics: Positive settlement, liquidity recovered, counterparty obligation reduced.
- **GIVE (Disbursement / Credit Extended / Cash Outflow)**:
  - Background: `bg-rose-50` or `bg-slate-100`
  - Text: `text-rose-800` or `text-slate-800`
  - Border: `border-rose-200` or `border-slate-300`
  - Directional Icon: `ArrowUpRight` (Funds transferred out)
  - Semantics: Capital placed at risk, ledger receivable created.

### Typography Hierarchy
- **Font Stack**:
  - Primary Sans: Inter Variable (`font-sans`)
  - Numeric & Ledger: JetBrains Mono (`font-mono`, `tabular-nums`)
- **Scale**:
  - H1 / Page Headers: `text-xl sm:text-2xl font-bold tracking-tight text-slate-900`
  - H2 / Section Headers: `text-sm sm:text-base font-semibold tracking-tight text-slate-800`
  - Monetary / Telemetry Values: `font-mono font-bold tabular-nums text-slate-900 tracking-tight`
  - Table Cell Copy: `text-xs font-normal text-slate-700`
  - Metadata / Badges / Labels: `text-[10px] sm:text-xs font-semibold uppercase tracking-wider`

## 2. Baseline UI Constraints (ui-skills standard)
1. **Utility Standard**:
   - Use `cn` (`clsx` + `tailwind-merge`) for all dynamic class composition.
   - Use `tabular-nums` on all monetary numbers, timestamps, and data columns.
   - Use `text-balance` for modal and section titles; `text-pretty` for descriptions and help text.
2. **Elevation & Depth**:
   - Restrained shadows: `shadow-2xs` and `shadow-xs`. Avoid heavy drop-shadows.
   - Hairline borders: `border border-slate-200/80` or `ring-1 ring-slate-200`.
3. **Square & Icon Elements**:
   - Use `size-*` utilities (e.g. `size-4`, `size-8`) instead of redundant `w-* h-*`.
   - Every icon-only button must have an explicit `aria-label`.
4. **Motion Discipline**:
   - Only compositor properties: `transform` (x, y, scale) and `opacity`.
   - Never animate `width`, `height`, `left`, `top`, or layout margins.
   - Duration cap: under 200ms for user feedback; ease-out on entrances.
   - Full support for `prefers-reduced-motion: reduce`.
5. **Anti-Slop Discipline**:
   - Zero gratuitous neon/purple gradients.
   - Zero floating-point money calculations (integer paise strictly enforced).
   - Empty states provide a single clear recovery action.
