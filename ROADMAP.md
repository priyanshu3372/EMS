# CMS HRMS — Product Roadmap

> **Purpose of this document:** bridge between what exists today (the EMS repo — a single-company HR system for CareerMap Solutions) and the long-term vision (the multi-tenant CMS HRMS SaaS platform described in `CMS HRMS Functional Requirements.pdf`).
>
> For granular file-by-file implementation tracking, see [.claude/plan.md](.claude/plan.md) — that remains the source of truth for day-to-day progress. This document is the strategic layer above it.
>
> **⚠️ Superseded in part.** A deep technical audit has since found that Phase A below is substantially larger than "finish the wiring": roughly ten core workflows are broken against real Postgres, and there are five independent privilege-escalation paths. See **[SYSTEM_DESIGN_AND_AUDIT.md](SYSTEM_DESIGN_AND_AUDIT.md)** for the verified findings, the target system design, and the P0–P4 work plan. Treat that document as authoritative for Phase A scope; §4 below is retained only as the original outline.

---

## 1. Where We Are Today

**EMS** is a single-tenant HR & Payroll system built for CareerMap Solutions' own internal use.

- React + Vite (JS) · Tailwind v4 · Supabase (Postgres + Auth) · Zustand · TanStack Query
- 7 flat roles: `super_admin`, `admin`, `hr`, `manager`, `rm`, `accounts`, `employee` (see [Role_Permission_Documentation.md](Role_Permission_Documentation.md))
- All UI pages built (Phase 2 ✅). Supabase integration ~60% done (Phase 3 🔄): Auth, Employees, Leave, Dashboard are wired to real Supabase; Attendance and Payroll have hooks built but pages still render mock data; Documents, Reports, Storage, edge function deploys, and RLS policies are pending.
- No `company_id` anywhere — every table implicitly belongs to one company.
- Payroll math is India-specific and hardcoded (PF 12%, ESI 0.75%, PT ₹200).
- `src/utils/geofence.js` already exists — GPS-based attendance groundwork is in place.

## 2. Where We're Going

`CMS HRMS Functional Requirements.pdf` (V2) describes a **multi-tenant SaaS HRMS**: one CMS Super Admin platform serving many independent client companies, each with its own Company Admin, users, and completely isolated data — plus licensing, subscriptions, billing, a country-configurable payroll engine, GPS attendance, a generic approval engine, and audit logs.

Key structural differences from today's EMS:

| Area | EMS today | PDF vision |
|---|---|---|
| Tenancy | Single company, implicit | Multi-tenant, every row carries `company_id` |
| Top-level roles | 7 roles, flat | CMS Super Admin (platform) → Company Admin → HR/Finance/Manager/Team Leader/Employee |
| Payroll | Hardcoded India rules | Country Payroll Configuration Engine (pluggable tax/statutory rules per country) |
| Commercial | None | Subscriptions, licenses (1 active user = 1 license), billing, module-based pricing |
| Access control | Role-only | Role + Module + Action + Data Scope permission matrix, configurable per company |
| Attendance | Basic check-in/out | GPS + radius validation, WFH toggle, shift management, overtime approval chain |

## 3. Strategy: Build in Two Phases

**Phase A (now):** Finish EMS as a complete, production-ready single-company product for CareerMap Solutions. This is the immediate, funded, real-use goal — get it working end-to-end on real Supabase data.

**Phase B (later, only after Phase A ships and is in real use):** Evolve the codebase toward the multi-tenant SaaS described in the PDF. This is a separate, larger effort — not something to start now.

The two phases share almost the entire UI and business logic. The migration in Phase B is mostly additive (new tables, a `company_id` column, a new top admin layer) rather than a rewrite — **provided** a few cheap, low-cost decisions are made now (see §6). Nothing in §6 is extra work today; it's just choosing the less-hardcoded of two equally-easy options.

---

## 4. Phase A — Finish the Single-Company EMS

This is the immediate priority. Order below follows `.claude/plan.md` Phase 3/4, sequenced by dependency and risk.

### A1. Verify current state
- `npm install`, run dev server, click through every page against the mock Supabase client to confirm nothing has regressed.

### A2. Complete Supabase data wiring
1. **Attendance page** → `useAttendance` hook (already written, page still on mock data)
2. **Payroll page** → `usePayrollRun` / `usePayslips` / `useSalaryStructures` hooks (already written, page still on mock data)
3. **Documents page** → build `useDocuments` / `useUploadDocument`, wire both tabs
4. **Reports page** → reuse existing hooks, remove mock fallback

### A3. Supabase Storage
- Create private buckets: `employee-documents`, `company-documents`
- Wire upload modals to real storage calls
- Signed URLs for document preview/download

### A4. Edge functions
- Deploy `invite-user` and `manage-user` (written, not yet deployed — needs a fresh Supabase PAT in `.mcp.json`)

### A5. Security hardening
- Row Level Security (RLS) policies on every table, matching [Role_Permission_Documentation.md §5](Role_Permission_Documentation.md)
- Role-based route guards in `App.jsx` / `ProtectedRoute.jsx` (currently front-end nav hides items, but direct-URL access and backend enforcement need to be verified per the doc's testing checklist §10)

### A6. Polish (Phase 4 in plan.md)
- Error boundaries, empty states, mobile responsive audit
- Code splitting (fix the recharts chunk-size build warning)
- Real PDF payslip export (replace `window.print`)
- Excel export for reports

**Definition of done for Phase A:** every page runs on real Supabase data (no mock client), every role's access matches the Role & Permission doc under RLS (not just hidden buttons), and the app is deployed (Vercel config already present — `vercel.json`).

---

## 5. Phase B — Multi-Tenant SaaS Migration (future, not now)

When CareerMap Solutions decides to commercialize this as CMS HRMS for other companies, the PDF's own recommended build order (§67) applies:

1. **Platform foundation** — multi-tenancy (`company_id` everywhere), CMS Super Admin, company onboarding, subscriptions, licenses, module management, RBAC v2
2. **Organization** — branches, departments, designations, teams (per company)
3. **Attendance v2** — GPS + radius per branch, shifts, WFH, overtime approval chain
4. **Leave v2** — configurable leave policies per company
5. **Payroll v2** — country payroll rules engine (replace hardcoded India logic with a pluggable `CountryPayrollRules` table + calculation engine)
6. **Documents & reporting v2** — audit logs, notifications architecture
7. **Commercial SaaS** — plans, billing, renewal/expiry automation, usage dashboards
8. **Future** — recruitment/ATS, performance, assets, mobile apps, biometric integrations, APIs

The PDF's §69 ("Items that should be locked before coding") is the right checklist to revisit **at the start of Phase B** — screen-by-screen UI flow, DB schema, license calculation logic, country payroll architecture, etc. Re-litigating those now, before Phase A ships, would be premature.

---

## 6. Forward-Compatible Decisions to Make Now

These cost nothing extra today but save real rework in Phase B. None of them mean building multi-tenancy now — just not actively closing the door on it.

- **Keep payroll math in one isolated module/function**, not scattered inline across components — so it can later be swapped for a per-country rules engine without touching UI code.
- **Keep company identity (name, logo, address, regional settings) in the `Settings → Company` tab / a config table**, never hardcoded as literal strings in components — this is already the case, keep it that way.
- **Centralize permission checks** (e.g. a single `hasPermission(role, module, action)` helper) rather than inline `if (role === 'hr')` scattered through pages — makes it mechanical to later add a `company_id` scope or a configurable permission matrix.
- **Use UUIDs for all primary keys** (already the case via Supabase) — required for safe multi-tenant merging later.
- **Avoid assuming "one Supabase project = one company"** in naming conventions (env vars, table names) — keep names tenant-agnostic (`profiles`, not `careermap_profiles`).

## 7. Explicit Non-Goals for Now

Deliberately deferred to Phase B — do not build these while finishing Phase A:

- Multi-tenancy / `company_id` on tables
- CMS Super Admin platform portal, company onboarding flow
- Subscriptions, licenses, billing engine
- Country-configurable payroll rules engine
- Custom/configurable role builder (current 7 fixed roles are fine)
- Generic approval-request engine (current leave/document-specific approval flows are fine)
- Audit log dashboard, GPS-based attendance enforcement beyond what `geofence.js` already scaffolds
- Native mobile apps

---

## 8. Immediate Next Action

Start with **A1 → A2.1 (Attendance)**: run the app locally to confirm current state, then wire the Attendance page to its existing `useAttendance` hook — it's the smallest, lowest-risk piece of remaining Phase 3 work and unblocks Payroll (which depends on locked attendance data per the PDF's payroll flow, §65).
