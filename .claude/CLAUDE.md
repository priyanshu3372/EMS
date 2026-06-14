# EMS — HR & Payroll Management System

## Project Overview
An HR & Payroll Management System for **CareerMap Solutions (CMS)**.
Internal platform for employee lifecycle, attendance, leave, payroll, and self-service.

> **Before making ANY change** — read [plan.md](./plan.md) first.
> It tracks every implemented file, what's pending, known dev shortcuts, and the Supabase integration roadmap.
> After making a change, update the relevant section in plan.md.

> For all UI styling decisions, refer to [style.md](./style.md) — it is the single source of truth for colors, typography, components, and layout.

---

## Current Phase
**Phase 2 complete — all UI pages built with mock data.**
**Next: Phase 3 — Supabase integration (schema → auth → queries).**
See [plan.md](./plan.md) for the full breakdown.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React + Vite |
| Language | JavaScript (no TypeScript) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin) |
| Backend / DB | Supabase (Postgres) |
| Auth | Supabase Auth (email/password) |
| State Management | Zustand |
| Server State | TanStack Query (for Supabase data fetching) |
| Icons | lucide-react |
| Charts | recharts |
| Font | Inter (Google Fonts, loaded in index.html) |

---

## User Roles

| Role | Access |
|---|---|
| Super Admin | Full system access — all modules, settings, users |
| HR Admin | Employee management, leave, attendance |
| Payroll Admin | Payroll, payslips, salary config |
| Manager | View team attendance, approve leaves |
| Employee | Self-service — own profile, payslips, leave requests |

---

## Core Modules & Build Status

| Module | Status | Route |
|---|---|---|
| Authentication | ✅ UI done, Supabase wired (needs profiles table) | `/signin` |
| Layout Shell | ✅ Done (auth guard bypassed for dev — see plan.md) | wraps all routes |
| HR Dashboard | ✅ Done (mock data) | `/dashboard` |
| Employee Management | ✅ Done (mock data) | `/employees` |
| Attendance | ✅ Done (mock data) | `/attendance` |
| Leave Management | ✅ Done (mock data) | `/leave` |
| Payroll | ✅ Done (mock data) | `/payroll` |
| Documents | ✅ Done (mock data) | `/documents` |
| Reports & Exports | ✅ Done (CSV export working, mock data) | `/reports` |
| Settings | ✅ Done (local state only) | `/settings` |
| ESS (Employee Self-Service) | 🔜 Pending | `/ess` (not yet added) |

---

## Project Structure (actual)

```
src/
  lib/
    supabase.js          ← Supabase client (reads from .env)
  stores/
    authStore.js         ← Zustand: user, role (DEV_USER seeded — remove before prod)
  components/
    Layout.jsx           ← Shell wrapper (auth guard disabled for dev)
    Sidebar.jsx          ← Dark nav sidebar, role-filtered
    TopBar.jsx           ← Top bar with title, bell, user dropdown
  pages/
    SignIn.jsx
    Dashboard.jsx
    Employees.jsx
    Attendance.jsx
    Leave.jsx
    Payroll.jsx
    Documents.jsx
    Reports.jsx
    Settings.jsx
  features/
    employees/
      AddEmployeeModal.jsx
      EmployeeDrawer.jsx
    attendance/
      MarkAttendanceModal.jsx
    leave/
      ApplyLeaveModal.jsx
    payroll/
      PayslipModal.jsx
  hooks/               ← empty, will hold custom Supabase query hooks
  assets/              ← empty
```

---

## Key Conventions

- JavaScript only (no .ts / .tsx files)
- Tailwind for all styling — no inline styles, no CSS files unless absolutely necessary
- Components built from scratch — no shadcn, no Ant Design
- Zustand for global client state (auth user, active role, UI state)
- TanStack Query for all Supabase data fetching/mutations
- Role-based access enforced at route level and component level
- `style.md` is the source of truth for all UI — always refer to it before building any component
- `plan.md` is the source of truth for project progress — always read and update it
- India payroll compliance — PF 12%, ESI 0.75% (gross ≤ ₹21,000), PT ₹200/month (Maharashtra)
- Salary formula: Basic = 40% CTC/12, HRA = 50% Basic, DA = 10% Basic, Special = remainder

---

## Supabase
- Project ref: `oacwnharknbmcuxlytli`
- API URL: `https://oacwnharknbmcuxlytli.supabase.co`
- Publishable (anon) key: in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- MCP configured — use Supabase MCP to create tables and run migrations directly

## MCP Servers
- **Supabase MCP** — configured in `.mcp.json`. Use it to create tables, run migrations, manage DB directly.
- No Figma MCP — design spec is in `style.md`. User will guide screen by screen.

## Design Spec
All UI follows `style.md`. CareerMap Solutions branding — blue/white/grey, sidebar layout, clean corporate UI, responsive.

---

## Dev Notes
- Dev server runs on `http://localhost:5174` (5173 was occupied)
- Auth is bypassed — `Layout.jsx` has guard commented out, `authStore.js` has DEV_USER seeded as super_admin
- Both must be restored before connecting real Supabase auth — see [plan.md → Known Dev Shortcuts](./plan.md)
- Build passes with recharts chunk size warning — expected, not an error
