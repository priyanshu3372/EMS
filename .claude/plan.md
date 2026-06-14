# EMS — Project Plan & Implementation History

> **This file is the single source of truth for project progress.**
> Read this before adding, modifying, or wiring any component or page.
> Update the relevant section every time a change is made.

---

## Current Status

**Phase:** UI Complete — Supabase integration pending
**Dev server:** `http://localhost:5174` (port 5173 was in use)
**Auth guard:** ✅ Active — `Layout.jsx` guards all routes, `authStore.js` DEV_USER removed
**Build:** Passing ✅ (chunk size warning from recharts is expected, not an error)

---

## Phase 1 — Project Scaffold ✅

| Task | Status | Notes |
|---|---|---|
| Vite + React init | ✅ Done | Created via temp dir copy (direct init was cancelled by vite prompt) |
| Tailwind CSS v4 | ✅ Done | Using `@tailwindcss/vite` plugin, `@import "tailwindcss"` in index.css |
| Inter font | ✅ Done | Loaded via Google Fonts in `index.html` |
| react-router-dom | ✅ Done | v6, BrowserRouter in main.jsx |
| TanStack Query | ✅ Done | QueryClient in main.jsx, ready for Supabase queries |
| Zustand | ✅ Done | `src/stores/authStore.js` — user, role, setUser, setRole, clearAuth |
| Supabase client | ✅ Done | `src/lib/supabase.js` — reads from .env |
| lucide-react | ✅ Done | Used for all icons |
| recharts | ✅ Done | Used in Dashboard and Reports |
| Folder structure | ✅ Done | src/{assets,components,features,pages,stores,lib,hooks} |

---

## Phase 2 — UI Pages ✅

### Authentication
| File | Status | Notes |
|---|---|---|
| `src/pages/SignIn.jsx` | ✅ Done | Split layout (blue panel + form), Supabase signInWithPassword wired, forgot password flow, show/hide password, error banner, loading spinner |

### Layout Shell
| File | Status | Notes |
|---|---|---|
| `src/components/Layout.jsx` | ✅ Done | Sidebar + TopBar + Outlet, auth guard (bypassed for dev), mobile overlay sidebar |
| `src/components/Sidebar.jsx` | ✅ Done | Dark slate (#0F172A), grouped nav, role-filtered links, active indicator, sign out |
| `src/components/TopBar.jsx` | ✅ Done | 64px white bar, page title, notification bell with dot, user avatar dropdown |

### Dashboard
| File | Status | Notes |
|---|---|---|
| `src/pages/Dashboard.jsx` | ✅ Done | 4 stat cards, weekly attendance bar chart (recharts), dept donut chart, pending approvals list with approve/reject, recent joiners |

### Employee Management
| File | Status | Notes |
|---|---|---|
| `src/pages/Employees.jsx` | ✅ Done | Searchable sortable table, dept + status filters, 9 mock employees |
| `src/features/employees/AddEmployeeModal.jsx` | ✅ Done | Add + Edit modal, field validation, datalist for designations |
| `src/features/employees/EmployeeDrawer.jsx` | ✅ Done | Right-side profile drawer, contact/employment sections, document slots |

### Attendance
| File | Status | Notes |
|---|---|---|
| `src/pages/Attendance.jsx` | ✅ Done | Daily + Monthly view toggle, stat cards (clickable filters), date nav, status tabs, hours worked calc, attendance % bar |
| `src/features/attendance/MarkAttendanceModal.jsx` | ✅ Done | Status selector grid, time pickers, optional note |

### Leave Management
| File | Status | Notes |
|---|---|---|
| `src/pages/Leave.jsx` | ✅ Done | 3 tabs: Requests / Balance / Holiday Calendar |
| `src/features/leave/ApplyLeaveModal.jsx` | ✅ Done | Leave type, date range, working days auto-calc, reason field |
| Leave Requests tab | ✅ Done | Stat cards (clickable), search, type + status filters, approve/reject inline |
| Leave Balance tab | ✅ Done | Per-employee balance table with progress bars |
| Holiday Calendar tab | ✅ Done | 13 holidays 2026, upcoming highlighted, past greyed, type badges |

### Payroll
| File | Status | Notes |
|---|---|---|
| `src/pages/Payroll.jsx` | ✅ Done | 3 tabs: Runs / Salary Structure / Payslips |
| `src/features/payroll/PayslipModal.jsx` | ✅ Done | Full formatted payslip, earnings + deductions tables, net pay banner, print/download |
| Payroll Runs tab | ✅ Done | 4-step workflow (Draft→Processing→Approved→Paid), employee breakdown, payroll history |
| Salary Structure tab | ✅ Done | CTC→Basic→HRA→Gross→PF→Net per employee, India compliance note |
| Payslips tab | ✅ Done | Month selector, all employees, view payslip modal |
| Salary computation | ✅ Done | Auto-computed: Basic=40%, HRA=50% of Basic, PF=12% Basic, ESI=0.75% if gross≤₹21k, PT=₹200 |

### Documents
| File | Status | Notes |
|---|---|---|
| `src/pages/Documents.jsx` | ✅ Done | 2 tabs: Company Docs / Employee Docs |
| Company Docs tab | ✅ Done | Category filter pills, search, list with hover actions, drag-drop upload modal |
| Employee Docs tab | ✅ Done | Employee list with completeness bar, checklist per employee, upload/delete toggle, incomplete warning |

### Reports
| File | Status | Notes |
|---|---|---|
| `src/pages/Reports.jsx` | ✅ Done | 8 report cards across 4 categories (Attendance/Leave/Payroll/Employee) |
| Report Preview Panel | ✅ Done | Right-side panel per report with filters, data table/chart, working CSV export |
| Reports included | ✅ Done | Monthly Attendance, Dept Attendance, Leave Summary, Leave Balance, Monthly Payroll, PF/ESI, Headcount, Joiners & Exits |

### Settings
| File | Status | Notes |
|---|---|---|
| `src/pages/Settings.jsx` | ✅ Done | Left sidebar nav, 5 sections |
| Company tab | ✅ Done | Identity, address, regional settings |
| Users & Roles tab | ✅ Done | Invite by email, role management table, activate/deactivate |
| Leave Config tab | ✅ Done | Leave types table, editable quotas, paid/carry-forward toggles |
| Payroll Config tab | ✅ Done | PF/ESI rates, PT slab configurator, pay day, payslip lock |
| Notifications tab | ✅ Done | 10 events × email + in-app toggles |

---

## Phase 3 — Supabase Integration 🔄 In Progress

### Step 1 — Database Schema ✅
Tables to create via Supabase MCP:

| Table | Key Columns |
|---|---|
| `profiles` | id (FK auth.users), full_name, role, employee_id, department, designation, phone, employment_type, date_of_joining, status, ctc, pan, bank_name, bank_account, ifsc |
| `departments` | id, name, head_id |
| `attendance` | id, employee_id, date, status, check_in, check_out, note |
| `leave_requests` | id, employee_id, leave_type, from_date, to_date, days, reason, status, applied_on, reviewed_by, reviewed_at |
| `leave_balances` | id, employee_id, year, casual, sick, earned, wfh, comp_off |
| `salary_structures` | id, employee_id, ctc, basic, hra, da, special_allowance, effective_from |
| `payroll_runs` | id, month, year, status, total_gross, total_net, processed_by, processed_at |
| `payslips` | id, employee_id, payroll_run_id, gross, pf, esi, pt, tds, net, generated_at |
| `documents` | id, name, category, type, size, url, uploaded_by, created_at |
| `employee_documents` | id, employee_id, doc_type, url, uploaded_at |
| `holidays` | id, name, date, type |
| `notifications` | id, user_id, type, message, read, created_at |

### Step 2 — Auth Integration ✅
- [x] `profiles` table created with RLS policies + `handle_new_user` trigger
- [x] Restore auth guard in `Layout.jsx` — active with loading spinner
- [x] `authStore.js` — DEV_USER removed, `loading` + `profile` state added
- [x] `App.jsx` — `getSession` + `onAuthStateChange` listener wired
- [x] `SignIn.jsx` — redirects to /dashboard if already authenticated
- [ ] Password reset flow — wired in SignIn, needs email config in Supabase dashboard

### Step 3 — Replace mock data with Supabase queries
Order of implementation (easiest → complex):

| Page | Hook/Query to build | Notes |
|---|---|---|
| Employees | `useEmployees()`, `useCreateEmployee()`, `useUpdateEmployee()` | ✅ Done — CRUD on `profiles`, RPC for auth user creation |
| Attendance | `useAttendance(date)`, `useMarkAttendance()` | ✅ Hook created, page pending |
| Leave | `useLeaveRequests()`, `useApplyLeave()`, `useUpdateLeaveStatus()` | ✅ Done — all wired to Supabase |
| Dashboard | `useDashboardStats()` | ✅ Done — real stats, weekly attendance, dept donut, pending approvals with approve/reject, recent joiners |
| Payroll | `usePayrollRun()`, `usePayslips()`, `useSalaryStructures()` | ✅ Hooks created, page pending |
| Documents | `useDocuments()`, `useUploadDocument()` | 🔜 Pending |
| Reports | Reuse existing query hooks | 🔜 Pending |

### Step 3b — User Management (Super Admin UI) ✅ Code done, deploy pending
Super Admin can invite users, assign roles, toggle status, and delete — all from Settings → Users & Roles. No DB access needed by client.

| File | Status | Notes |
|---|---|---|
| `supabase/functions/invite-user/index.ts` | ✅ Written, 🔜 Deploy pending | Calls `auth.admin.inviteUserByEmail`, upserts profile with role. Sends email invite automatically. |
| `supabase/functions/manage-user/index.ts` | ✅ Written, 🔜 Deploy pending | Actions: `update_role`, `toggle_status`, `delete_user`. All gated to super_admin. |
| `src/hooks/useUsers.js` | ✅ Done | `useUsers`, `useInviteUser`, `useUpdateUserRole`, `useToggleUserStatus`, `useDeleteUser` |
| `src/pages/Settings.jsx` — `UsersSettings` | ✅ Done | Wired to real hooks. Invite form with error/success feedback. Loading states. Confirmation on delete. |

**To deploy edge functions:** Update `.mcp.json` with new Supabase PAT → restart Claude Code → re-run deploy.

### Step 4 — Supabase Storage
- [ ] Create bucket `employee-documents` (private)
- [ ] Create bucket `company-documents` (private)
- [ ] Wire upload modal in Documents page to `supabase.storage`
- [ ] Generate signed URLs for document preview/download

### Step 5 — Real-time (nice to have)
- [ ] Leave approval notifications via Supabase Realtime
- [ ] Dashboard stats auto-refresh

---

## Phase 4 — Polish & Production 🔜

- [ ] Restore auth guard (`Layout.jsx` + `authStore.js`)
- [ ] Role-based route protection (redirect employee away from /payroll, etc.)
- [ ] ESS (Employee Self-Service) — employee-specific dashboard view
- [ ] Code splitting (lazy imports) — fix chunk size warning
- [ ] Error boundaries on pages
- [ ] Empty states with proper illustrations
- [ ] Mobile responsive audit across all pages
- [ ] Supabase Row Level Security (RLS) policies per role
- [ ] Email templates in Supabase for invite + leave notifications
- [ ] PDF export for payslips (replace window.print with jsPDF or similar)
- [ ] Excel export for reports (xlsx library)

---

## Known Dev Shortcuts (restore before production)

| File | Line | What to fix |
|---|---|---|
| ~~`src/components/Layout.jsx`~~ | ✅ Fixed | Auth guard restored |
| ~~`src/stores/authStore.js`~~ | ✅ Fixed | DEV_USER removed |

---

## File Map (all created files)

```
src/
  lib/
    supabase.js                          ← Supabase client
  stores/
    authStore.js                         ← user, role state (has DEV_USER for now)
  components/
    Layout.jsx                           ← Shell: sidebar + topbar + outlet
    Sidebar.jsx                          ← Dark nav, role-filtered, sign out
    TopBar.jsx                           ← Page title, bell, user dropdown
  pages/
    SignIn.jsx                           ← Login page
    Dashboard.jsx                        ← HR dashboard with charts
    Employees.jsx                        ← Employee list + filters
    Attendance.jsx                       ← Daily/monthly attendance
    Leave.jsx                            ← Leave requests/balance/holidays
    Payroll.jsx                          ← Payroll runs/salary/payslips
    Documents.jsx                        ← Company + employee docs
    Reports.jsx                          ← 8 reports with CSV export
    Settings.jsx                         ← 5-tab settings page
  features/
    employees/
      AddEmployeeModal.jsx               ← Add/edit employee form
      EmployeeDrawer.jsx                 ← Profile side drawer
    attendance/
      MarkAttendanceModal.jsx            ← Mark/edit attendance
    leave/
      ApplyLeaveModal.jsx                ← Apply leave form
    payroll/
      PayslipModal.jsx                   ← Formatted payslip viewer
```
