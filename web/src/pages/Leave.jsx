import { createElement, useState, useMemo } from 'react'
import {
  CheckCircle, XCircle, Clock, CalendarDays, Plus,
  Search, Download, ChevronRight, Palmtree, Filter,
} from 'lucide-react'
import ApplyLeaveModal from '../features/leave/ApplyLeaveModal'
import { useLeaveRequests, useLeaveBalances, useHolidays, useApplyLeave, useUpdateLeaveStatus } from '../hooks/useLeave'
import { useAuthStore } from '../stores/authStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEAVE_TYPE_META = {
  casual: { label: 'Casual Leave', cls: 'bg-blue-100 text-blue-700' },
  sick: { label: 'Sick Leave', cls: 'bg-red-100 text-red-600' },
  earned: { label: 'Earned Leave', cls: 'bg-purple-100 text-purple-700' },
  maternity: { label: 'Maternity Leave', cls: 'bg-pink-100 text-pink-700' },
  paternity: { label: 'Paternity Leave', cls: 'bg-indigo-100 text-indigo-700' },
  wfh: { label: 'WFH', cls: 'bg-teal-100 text-teal-700' },
  comp_off: { label: 'Comp Off', cls: 'bg-orange-100 text-orange-700' },
}

const STATUS_META = {
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-600', icon: XCircle },
}

const HOLIDAY_TYPE = {
  national: { cls: 'bg-blue-100 text-blue-700', label: 'National' },
  festival: { cls: 'bg-orange-100 text-orange-700', label: 'Festival' },
  regional: { cls: 'bg-purple-100 text-purple-700', label: 'Regional' },
  optional: { cls: 'bg-gray-100 text-gray-600', label: 'Optional' },
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateShort(str) {
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const TABS = ['requests', 'balance', 'holidays']
const TAB_LABELS = { requests: 'Leave Requests', balance: 'Leave Balance', holidays: 'Holiday Calendar' }
const STATUS_FILTER = ['all', 'pending', 'approved', 'rejected']

// ─── Leave Requests tab ───────────────────────────────────────────────────────

function initials(name) {
  return (name || '').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function RequestsTab({ requests, onApprove, onReject, isLoading, isManagement }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = useMemo(() => requests.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (typeFilter !== 'all' && r.leave_type !== typeFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const name = (r.profiles?.full_name || '').toLowerCase()
      const eid = (r.profiles?.employee_id || '').toLowerCase()
      if (!name.includes(q) && !eid.includes(q)) return false
    }
    return true
  }), [requests, statusFilter, typeFilter, search])

  const counts = useMemo(() => ({
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  }), [requests])

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'pending', label: 'Pending', Icon: Clock, bg: 'bg-amber-100', text: 'text-amber-600' },
          { key: 'approved', label: 'Approved', Icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-600' },
          { key: 'rejected', label: 'Rejected', Icon: XCircle, bg: 'bg-red-100', text: 'text-red-600' },
        ].map(({ key, label, Icon, bg, text }) => (
          <button key={key} onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 transition-all text-left
              ${statusFilter === key ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className={`${bg} rounded-xl p-3 shrink-0`}>
              {createElement(Icon, { className: `w-5 h-5 ${text}` })}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{counts[key]}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search employee…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="all">All Types</option>
            {Object.entries(LEAVE_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="flex gap-1 ml-auto">
          {STATUS_FILTER.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize
                ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Leave Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Applied On</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-16 text-sm text-gray-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-sm text-gray-400">No leave requests found.</td></tr>
              ) : filtered.map((req) => {
                const ltMeta = LEAVE_TYPE_META[req.leave_type] ?? { label: req.leave_type, cls: 'bg-gray-100 text-gray-600' }
                const stMeta = STATUS_META[req.status]
                const StIcon = stMeta.icon
                return (
                  <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-blue-700 text-xs font-semibold">{initials(req.profiles?.full_name)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{req.profiles?.full_name || '—'}</p>
                          <p className="text-xs text-gray-400">{req.profiles?.department || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ltMeta.cls}`}>
                        {ltMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-gray-900">{formatDateShort(req.from_date)} – {formatDateShort(req.to_date)}</p>
                      <p className="text-xs text-gray-400">{req.days} working day{req.days !== 1 ? 's' : ''}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-gray-600">{formatDate(req.applied_on)}</p>
                      {req.reason && <p className="text-xs text-gray-400 truncate max-w-36" title={req.reason}>{req.reason}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${stMeta.cls}`}>
                        <StIcon className="w-3 h-3" />
                        {stMeta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {isManagement && req.status === 'pending' ? (
                          <>
                            <button onClick={() => onApprove(req.id, req.employee_id, req.leave_type, req.days)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium transition-colors">
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button onClick={() => onReject(req.id, req.employee_id, req.leave_type, req.days)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors">
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        ) : req.status === 'pending' ? (
                          <span className="text-xs text-amber-600 font-medium">Pending Approval</span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No action</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Showing {filtered.length} of {requests.length} requests</p>
        </div>
      </div>
    </div>
  )
}

// ─── Leave Balance tab ────────────────────────────────────────────────────────

/**
 * Leave balances for whoever is signed in.
 *
 * TWO THINGS CHANGED HERE, and both were the same bug.
 *
 * The quotas used to be hardcoded — casual 12, earned 18, work-from-home 24 —
 * so the progress bars were a percentage of a number nobody had configured. A
 * company that sets casual leave to fifteen days got bars that were quietly
 * wrong. Every figure below now comes from the server, including the quota.
 *
 * The table also used to list EVERY employee. That view belongs to HR and needs
 * an endpoint that returns balances for many people; today's returns the
 * caller's own. Showing one person's numbers under a heading that says
 * "per employee" would be worse than showing them honestly, so the heading
 * changed too. The HR view is noted for a later day rather than faked.
 */
function BalanceTab() {
  // No arguments: the server decides whose balances these are. Passing a user
  // id from the browser was never a filter, only a suggestion — see §A11.
  const { data: balances = [], isLoading } = useLeaveBalances()

  const colours = ['bg-blue-500', 'bg-red-400', 'bg-purple-500', 'bg-teal-500', 'bg-amber-500']

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-base font-semibold text-gray-900">My Leave Balance</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Days remaining this leave year, after anything already applied for
          </p>
        </div>

        {isLoading ? (
          <p className="text-center py-16 text-sm text-gray-400">Loading…</p>
        ) : balances.length === 0 ? (
          <p className="text-center py-16 text-sm text-gray-400">
            No leave types are configured yet.
          </p>
        ) : (
          <div className="p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {balances.map((b, index) => {
              // Against the quota the SERVER reports, not a number in this file.
              // A quota of zero means the type is granted rather than accrued —
              // comp off, work from home — and a percentage of zero is not a
              // number worth drawing.
              const quota = b.annual_quota ?? 0
              const pct = quota > 0 ? Math.min(100, Math.round((b.available / quota) * 100)) : null

              return (
                <div key={b.leave_type_id} className="border border-gray-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                      <p className="text-xs text-gray-400">{b.code}</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{b.available}</p>
                  </div>

                  {pct === null ? (
                    <p className="text-xs text-gray-400">Granted as needed, not accrued</p>
                  ) : (
                    <>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colours[index % colours.length]} rounded-full`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400">of {quota} days</p>
                    </>
                  )}

                  {b.pending > 0 && (
                    // Shown separately because it is a different fact: these
                    // days are not spent, they are spoken for. One number that
                    // meant both would mean neither.
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      {b.pending} day{b.pending === 1 ? '' : 's'} awaiting approval
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


function HolidaysTab() {
  const { data: holidays = [] } = useHolidays()
  const today = new Date().toISOString().split('T')[0]
  const upcoming = holidays.filter((h) => h.date >= today)
  const past = holidays.filter((h) => h.date < today)

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-base font-semibold text-gray-900">Holiday Calendar — 2026</p>
            <p className="text-xs text-gray-400 mt-0.5">{holidays.length} holidays this year</p>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
            <Download className="w-4 h-4" />Export
          </button>
        </div>

        {/* Upcoming */}
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Upcoming</p>
        </div>
        <div className="divide-y divide-gray-50">
          {upcoming.map((h) => {
            const hMeta = HOLIDAY_TYPE[h.type]
            const d = new Date(h.date)
            const isNext = h.date === upcoming[0]?.date
            return (
              <div key={h.date} className={`flex items-center gap-4 px-5 py-4 ${isNext ? 'bg-blue-50/40' : 'hover:bg-gray-50'} transition-colors`}>
                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${isNext ? 'bg-blue-600' : 'bg-gray-100'}`}>
                  <span className={`text-xs font-medium ${isNext ? 'text-blue-100' : 'text-gray-500'}`}>
                    {d.toLocaleString('en-IN', { month: 'short' })}
                  </span>
                  <span className={`text-lg font-bold leading-none ${isNext ? 'text-white' : 'text-gray-900'}`}>
                    {d.getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{h.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{d.toLocaleString('en-IN', { weekday: 'long' })}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${hMeta.cls}`}>
                  {hMeta.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Past */}
        {past.length > 0 && (
          <>
            <div className="px-5 py-3 bg-gray-50 border-y border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Past Holidays</p>
            </div>
            <div className="divide-y divide-gray-50">
              {past.map((h) => {
                const hMeta = HOLIDAY_TYPE[h.type]
                const d = new Date(h.date)
                return (
                  <div key={h.date} className="flex items-center gap-4 px-5 py-3.5 opacity-50 hover:opacity-70 transition-opacity">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs text-gray-400">{d.toLocaleString('en-IN', { month: 'short' })}</span>
                      <span className="text-lg font-bold text-gray-600 leading-none">{d.getDate()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">{h.name}</p>
                      <p className="text-xs text-gray-400">{d.toLocaleString('en-IN', { weekday: 'long' })}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${hMeta.cls}`}>
                      {hMeta.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Leave() {
  const { user, role } = useAuthStore()
  const isManagement = ['super_admin', 'admin', 'hr', 'manager', 'rm'].includes(role)
  // Same: scoping moved to the server. HR sees the company, a manager their
  // direct reports, an employee their own.
  const { data: requests = [], isLoading } = useLeaveRequests()
  const updateLeaveStatus = useUpdateLeaveStatus()
  const applyLeave = useApplyLeave()
  const [tab, setTab] = useState('requests')
  const [applyOpen, setApplyOpen] = useState(false)

  function handleApprove(id, employeeId, leaveType, days) {
    updateLeaveStatus.mutate({ id, status: 'approved', reviewed_by: user?.id, employee_id: employeeId, leave_type: leaveType, days })
  }

  function handleReject(id, employeeId, leaveType, days) {
    updateLeaveStatus.mutate({ id, status: 'rejected', reviewed_by: user?.id, employee_id: employeeId, leave_type: leaveType, days })
  }

  function handleApply(data) {
    applyLeave.mutate({ ...data, employee_id: user?.id, applied_on: new Date().toISOString().split('T')[0] })
    setApplyOpen(false)
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  return (
    <>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {pendingCount > 0
                ? <span className="text-amber-600 font-medium">{pendingCount} request{pendingCount !== 1 ? 's' : ''} pending approval</span>
                : 'All requests are up to date'}
            </p>
          </div>
          <button onClick={() => setApplyOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Apply for Leave
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-2
                ${tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}>
              {t === 'requests' && <CalendarDays className="w-4 h-4" />}
              {t === 'balance' && <ChevronRight className="w-4 h-4" />}
              {t === 'holidays' && <Palmtree className="w-4 h-4" />}
              {TAB_LABELS[t]}
              {t === 'requests' && pendingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-medium">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'requests' && (
          <RequestsTab requests={requests} isLoading={isLoading} onApprove={handleApprove} onReject={handleReject} onApply={handleApply} isManagement={isManagement} />
        )}
        {tab === 'balance' && <BalanceTab />}
        {tab === 'holidays' && <HolidaysTab />}
      </div>

      <ApplyLeaveModal open={applyOpen} onClose={() => setApplyOpen(false)} onSave={handleApply} saving={applyLeave.isPending} />
    </>
  )
}
