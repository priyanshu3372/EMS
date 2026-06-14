import { useState, useMemo } from 'react'
import {
  IndianRupee, Users, CheckCircle, Clock, TrendingUp,
  Play, Download, Eye, AlertCircle, Search,
} from 'lucide-react'
import PayslipModal from '../features/payroll/PayslipModal'
import { useEmployees } from '../hooks/useEmployees'
import { usePayrollRuns, useCreatePayrollRun, useUpdatePayrollRun, usePayslips } from '../hooks/usePayroll'
import { useAuthStore } from '../stores/authStore'

// ─── Salary computation ───────────────────────────────────────────────────────

function computeSalary(ctc) {
  const gross   = Math.round((ctc || 0) / 12)
  const basic   = Math.round(gross * 0.40)
  const hra     = Math.round(basic * 0.50)
  const da      = Math.round(basic * 0.10)
  const special = gross - basic - hra - da
  const pf      = Math.round(basic * 0.12)
  const esi     = gross <= 21000 ? Math.round(gross * 0.0075) : 0
  const pt      = gross > 10000 ? 200 : 0
  const net     = gross - pf - esi - pt
  return { gross, basic, hra, da, special, pf, esi, pt, net }
}

function fmt(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }
function initials(name) { return (name || '').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() }

const RUN_STATES = ['draft', 'processing', 'approved', 'paid']
const STATE_META = {
  draft:      { label: 'Draft',      cls: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
  processing: { label: 'Processing', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  approved:   { label: 'Approved',   cls: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  paid:       { label: 'Paid',       cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
}

const NOW     = new Date()
const CUR_MONTH = NOW.getMonth() + 1
const CUR_YEAR  = NOW.getFullYear()
const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

// ─── Payroll Runs tab ─────────────────────────────────────────────────────────

function RunsTab({ employees }) {
  const { data: runs = [], isLoading } = usePayrollRuns()
  const createRun   = useCreatePayrollRun()
  const updateRun   = useUpdatePayrollRun()
  const { user }    = useAuthStore()

  const currentRun  = runs.find((r) => r.month === CUR_MONTH && r.year === CUR_YEAR)
  const runState    = currentRun?.status || 'draft'
  const stateIdx    = RUN_STATES.indexOf(runState)

  const totalGross  = employees.reduce((s, e) => s + e.salary.gross, 0)
  const totalNet    = employees.reduce((s, e) => s + e.salary.net, 0)

  const history = runs.filter((r) => !(r.month === CUR_MONTH && r.year === CUR_YEAR))

  const nextAction = {
    draft:      { label: 'Run Payroll',  icon: Play,        next: 'processing', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    processing: { label: 'Approve',      icon: CheckCircle, next: 'approved',   color: 'bg-green-600 hover:bg-green-700 text-white' },
    approved:   { label: 'Mark as Paid', icon: CheckCircle, next: 'paid',       color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    paid: null,
  }[runState]

  async function handleAdvance() {
    const next = nextAction.next
    if (!currentRun) {
      await createRun.mutateAsync({
        month: CUR_MONTH, year: CUR_YEAR, status: next,
        total_gross: totalGross, total_net: totalNet, processed_by: user?.id,
        processed_at: new Date().toISOString(),
      })
    } else {
      await updateRun.mutateAsync({ id: currentRun.id, status: next, processed_by: user?.id, processed_at: new Date().toISOString() })
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <p className="text-base font-semibold text-gray-900">{MONTH_NAMES[CUR_MONTH]} {CUR_YEAR} Payroll</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATE_META[runState].cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATE_META[runState].dot}`} />
                {STATE_META[runState].label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {RUN_STATES.map((s, i) => {
                const done = i <= stateIdx
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                      ${done ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {i < stateIdx ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs capitalize hidden sm:block ${done ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                      {STATE_META[s].label}
                    </span>
                    {i < RUN_STATES.length - 1 && (
                      <div className={`w-8 h-0.5 ${i < stateIdx ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
            {nextAction && (
              <button onClick={handleAdvance} disabled={createRun.isPending || updateRun.isPending}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${nextAction.color}`}>
                <nextAction.icon className="w-4 h-4" />
                {nextAction.label}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500">Total Gross</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{fmt(totalGross)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Deductions</p>
            <p className="text-lg font-bold text-red-500 mt-0.5">− {fmt(totalGross - totalNet)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Net Payout</p>
            <p className="text-lg font-bold text-green-600 mt-0.5">{fmt(totalNet)}</p>
          </div>
        </div>
      </div>

      {runState === 'draft' && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">Review salary structures before running payroll. Click <strong>Run Payroll</strong> to begin.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-base font-semibold text-gray-900">Employee Breakdown</p>
          <span className="text-xs text-gray-400">{employees.length} employees</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">PF</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">ESI</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">PT</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Pay</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-sm text-gray-400">No employees with salary data yet.</td></tr>
              ) : employees.map((emp) => (
                <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-blue-700 text-xs font-semibold">{initials(emp.full_name)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{emp.full_name}</p>
                        <p className="text-xs text-gray-400">{emp.designation}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-gray-700">{fmt(emp.salary.gross)}</td>
                  <td className="px-4 py-3.5 text-right text-sm text-red-500">− {fmt(emp.salary.pf)}</td>
                  <td className="px-4 py-3.5 text-right text-sm text-red-500">{emp.salary.esi > 0 ? `− ${fmt(emp.salary.esi)}` : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-right text-sm text-red-500">{emp.salary.pt > 0 ? `− ${fmt(emp.salary.pt)}` : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-green-600">{fmt(emp.salary.net)}</td>
                </tr>
              ))}
              {employees.length > 0 && (
                <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                  <td className="px-5 py-3.5 text-sm text-gray-900">Total</td>
                  <td className="px-4 py-3.5 text-right text-sm text-gray-900">{fmt(totalGross)}</td>
                  <td className="px-4 py-3.5 text-right text-sm text-red-600">− {fmt(employees.reduce((s, e) => s + e.salary.pf, 0))}</td>
                  <td className="px-4 py-3.5 text-right text-sm text-red-600">− {fmt(employees.reduce((s, e) => s + e.salary.esi, 0))}</td>
                  <td className="px-4 py-3.5 text-right text-sm text-red-600">− {fmt(employees.reduce((s, e) => s + e.salary.pt, 0))}</td>
                  <td className="px-4 py-3.5 text-right text-sm text-green-700">{fmt(totalNet)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-base font-semibold text-gray-900">Payroll History</p>
          </div>
          <div className="divide-y divide-gray-50">
            {history.map((h) => {
              const meta = STATE_META[h.status]
              return (
                <div key={h.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{MONTH_NAMES[h.month]} {h.year}</p>
                      <p className="text-xs text-gray-400">{h.processed_at ? `Processed on ${new Date(h.processed_at).toLocaleDateString('en-IN')}` : '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-semibold text-gray-900">{fmt(h.total_net)}</p>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}>{meta.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Salary Structure tab ─────────────────────────────────────────────────────

function SalaryTab({ employees }) {
  const [search, setSearch] = useState('')

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase()
    return !q || (e.full_name || '').toLowerCase().includes(q) || (e.department || '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search employee or department…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400" />
        </div>
        <span className="text-sm text-gray-400 shrink-0">{filtered.length} employees</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">CTC (Annual)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Basic</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">HRA</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross / mo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">PF / mo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Net / mo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-sm text-gray-400">No salary data yet.</td></tr>
              ) : filtered.map((emp) => (
                <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-blue-700 text-xs font-semibold">{initials(emp.full_name)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{emp.full_name}</p>
                        <p className="text-xs text-gray-400">{emp.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">{fmt(emp.ctc)}</td>
                  <td className="px-4 py-3.5 text-right text-sm text-gray-700">{fmt(emp.salary.basic)}</td>
                  <td className="px-4 py-3.5 text-right text-sm text-gray-700">{fmt(emp.salary.hra)}</td>
                  <td className="px-4 py-3.5 text-right text-sm text-gray-700">{fmt(emp.salary.gross)}</td>
                  <td className="px-4 py-3.5 text-right text-sm text-red-500">{fmt(emp.salary.pf)}</td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-green-600">{fmt(emp.salary.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-600">PF = 12% of Basic · ESI = 0.75% of Gross (if Gross ≤ ₹21,000) · PT = ₹200/month (Maharashtra)</p>
        </div>
      </div>
    </div>
  )
}

// ─── Payslips tab ─────────────────────────────────────────────────────────────

function PayslipsTab({ employees }) {
  const { data: runs = [] }   = usePayrollRuns()
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [payslipEmp, setPayslipEmp]       = useState(null)

  const runOptions = runs.filter((r) => r.status === 'paid' || r.status === 'approved')
  const activeRunId = selectedRunId || runOptions[0]?.id
  const { data: payslips = [] } = usePayslips(activeRunId)

  const activeRun = runs.find((r) => r.id === activeRunId)
  const runLabel  = activeRun ? `${MONTH_NAMES[activeRun.month]} ${activeRun.year}` : '—'

  // Merge payslips with employee data or fall back to employees list
  const displayList = payslips.length > 0
    ? payslips.map((p) => ({
        ...p.profiles,
        id: p.employee_id,
        salary: { net: p.net, gross: p.gross, basic: p.basic, hra: p.hra, da: p.da, special: p.special_allowance, pf: p.pf, esi: p.esi, pt: p.pt },
        payslipData: p,
      }))
    : employees.map((emp) => ({ ...emp, payslipData: null }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Select Month</label>
        <select value={activeRunId || ''} onChange={(e) => setSelectedRunId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {runOptions.length === 0 && <option value="">No payroll runs yet</option>}
          {runOptions.map((r) => (
            <option key={r.id} value={r.id}>{MONTH_NAMES[r.month]} {r.year}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-base font-semibold text-gray-900">Payslips — {runLabel}</p>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
            <Download className="w-4 h-4" /> Download All
          </button>
        </div>
        {displayList.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">No payslips yet. Run payroll first.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {displayList.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-blue-700 text-sm font-semibold">{initials(emp.full_name)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{emp.full_name}</p>
                    <p className="text-xs text-gray-400">{emp.employee_id} · {emp.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-green-600">{fmt(emp.salary?.net)}</p>
                    <p className="text-xs text-gray-400">Net pay</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Generated</span>
                  <button onClick={() => setPayslipEmp(emp)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium transition-colors">
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PayslipModal
        open={!!payslipEmp}
        employee={payslipEmp}
        month={runLabel}
        onClose={() => setPayslipEmp(null)}
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const TABS = ['runs', 'structure', 'payslips']
const TAB_LABELS = { runs: 'Payroll Runs', structure: 'Salary Structure', payslips: 'Payslips' }

export default function Payroll() {
  const [tab, setTab] = useState('runs')
  const { data: rawEmployees = [] } = useEmployees()

  const employees = useMemo(() =>
    rawEmployees.map((e) => ({ ...e, salary: computeSalary(Number(e.ctc) || 0) })),
    [rawEmployees]
  )

  const totalMonthly = employees.reduce((s, e) => s + e.salary.gross, 0)
  const totalNet     = employees.reduce((s, e) => s + e.salary.net, 0)
  const avgSalary    = employees.length ? Math.round(totalNet / employees.length) : 0

  return (
    <div className="space-y-5">

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payroll</h2>
          <p className="text-sm text-gray-500 mt-0.5">{MONTH_NAMES[CUR_MONTH]} {CUR_YEAR} · {employees.length} active employees</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Gross',   value: fmt(totalMonthly), icon: IndianRupee, bg: 'bg-blue-100',   ic: 'text-blue-600',   sub: 'Total payroll' },
          { label: 'Monthly Net Pay', value: fmt(totalNet),     icon: TrendingUp,  bg: 'bg-green-100',  ic: 'text-green-600',  sub: 'After deductions' },
          { label: 'Avg Net Salary',  value: fmt(avgSalary),    icon: Users,       bg: 'bg-purple-100', ic: 'text-purple-600', sub: 'Per employee' },
          { label: 'Payroll Status',  value: 'Draft',           icon: Clock,       bg: 'bg-amber-100',  ic: 'text-amber-600',  sub: `${MONTH_NAMES[CUR_MONTH]} ${CUR_YEAR}` },
        ].map(({ label, value, icon: Icon, bg, ic, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className={`${bg} rounded-xl p-3 shrink-0`}><Icon className={`w-6 h-6 ${ic}`} /></div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'runs'      && <RunsTab employees={employees} />}
      {tab === 'structure' && <SalaryTab employees={employees} />}
      {tab === 'payslips'  && <PayslipsTab employees={employees} />}
    </div>
  )
}
