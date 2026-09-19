import { createElement, useState, useMemo } from 'react'
import {
  UserCheck, UserX, Clock, Monitor, Search,
  ChevronLeft, ChevronRight, Download, Edit2, Calendar,
} from 'lucide-react'
import MarkAttendanceModal from '../features/attendance/MarkAttendanceModal'
import { useEmployees } from '../hooks/useEmployees'
import { useAttendance, useMonthAttendance, useMarkAttendance } from '../hooks/useAttendance'
import { useAuthStore } from '../stores/authStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META = {
  present:    { label: 'Present',    cls: 'bg-green-100 text-green-700',    dot: 'bg-green-500' },
  absent:     { label: 'Absent',     cls: 'bg-red-100 text-red-600',        dot: 'bg-red-500' },
  late:       { label: 'Late',       cls: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500' },
  wfh:        { label: 'WFH',        cls: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500' },
  half_day:   { label: 'Half Day',   cls: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-500' },
  weekly_off: { label: 'Weekly Off', cls: 'bg-indigo-100 text-indigo-700',  dot: 'bg-indigo-500' },
}

const STATUS_TABS  = ['all', 'present', 'absent', 'late', 'wfh', 'half_day', 'weekly_off']
const TAB_LABELS   = { all: 'All', present: 'Present', absent: 'Absent', late: 'Late', wfh: 'WFH', half_day: 'Half Day', weekly_off: 'Weekly Off' }
const DEPARTMENTS  = ['All', 'Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Marketing', 'Design']

function hoursWorked(ci, co) {
  if (!ci || !co) return '—'
  const [ch, cm] = ci.split(':').map(Number)
  const [oh, om] = co.split(':').map(Number)
  const mins = (oh * 60 + om) - (ch * 60 + cm)
  if (mins <= 0) return '—'
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function formatDisplayDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function offsetDate(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function initials(name) {
  return (name || '').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Monthly calendar ─────────────────────────────────────────────────────────

function MonthlyCalendar({ attendanceMap, year, month }) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay    = new Date(year, month - 1, 1).getDay()
  const monthLabel  = new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-base font-semibold text-gray-900">{monthLabel} — My Attendance</p>
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          {Object.entries(STATUS_META).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 font-medium">
              <span className={`w-2.5 h-2.5 rounded-full ${v.dot}`} />
              {v.label}
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const status = attendanceMap[key]
          const meta = STATUS_META[status]
          const isToday = key === new Date().toISOString().slice(0, 10)
          return (
            <div key={key}
              className={`aspect-square flex items-center justify-center rounded-lg text-xs font-semibold transition-all duration-100
                ${isToday ? 'ring-2 ring-blue-500 font-bold' : ''}
                ${meta ? meta.cls : 'text-gray-400 bg-gray-50'}`}>
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Attendance() {
  const { role, user } = useAuthStore()
  const today = new Date().toISOString().slice(0, 10)
  
  // Default to daily for management, monthly for employee
  const [view, setView]             = useState(role === 'employee' ? 'monthly' : 'daily')
  const [date, setDate]             = useState(today)
  const [tab, setTab]               = useState('all')
  const [deptFilter, setDeptFilter] = useState('All')
  const [search, setSearch]         = useState('')
  const [modalEmp, setModalEmp]     = useState(null)

  const { data: employees = [] }            = useEmployees()
  const { data: attRecords = [], isLoading } = useAttendance(date)
  const markAttendance                       = useMarkAttendance()

  // For monthly calendar
  const [calYear, calMonth] = date.split('-').map(Number)
  const { data: monthRecords = [] } = useMonthAttendance(calYear, calMonth)

  const canAmend = ['super_admin', 'hr'].includes(role)

  // Merge employees with their attendance for the selected date
  const records = useMemo(() => {
    return employees.map((emp) => {
      const att = attRecords.find((a) => a.employee_id === emp.id)
      return {
        id: emp.id,
        employee_id: emp.employee_id || '—',
        full_name: emp.full_name,
        department: emp.department || '—',
        designation: emp.designation || '—',
        status: att?.status || null,
        check_in: att?.check_in || '',
        check_out: att?.check_out || '',
        note: att?.note || '',
      }
    })
  }, [employees, attRecords])

  const stats = useMemo(() => ({
    present:    records.filter((r) => r.status === 'present').length,
    absent:     records.filter((r) => r.status === 'absent').length,
    late:       records.filter((r) => r.status === 'late').length,
    wfh:        records.filter((r) => r.status === 'wfh').length,
    half_day:   records.filter((r) => r.status === 'half_day').length,
    weekly_off: records.filter((r) => r.status === 'weekly_off').length,
    total:      records.length,
  }), [records])

  const filtered = useMemo(() => records.filter((r) => {
    if (tab !== 'all' && r.status !== tab) return false
    if (deptFilter !== 'All' && r.department !== deptFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!r.full_name.toLowerCase().includes(q) && !r.employee_id.toLowerCase().includes(q)) return false
    }
    return true
  }), [records, tab, deptFilter, search])

  function handleSave(updated) {
    markAttendance.mutate({
      employee_id: updated.id,
      date,
      status: updated.status,
      check_in: updated.check_in || null,
      check_out: updated.check_out || null,
      note: updated.note || '',
      check_in_lat: updated.check_in_lat,
      check_in_lon: updated.check_in_lon,
      distance_km: updated.distance_km,
      geofence_verified: updated.geofence_verified,
    })
    setModalEmp(null)
  }

  function handleExportCSV() {
    const headers = ['Employee Name', 'Employee ID', 'Department', 'Designation', 'Status', 'Check In', 'Check Out', 'Hours Worked', 'Note']
    const rows = filtered.map((r) => [
      r.full_name || '',
      r.employee_id || '',
      r.department || '',
      r.designation || '',
      r.status || 'Not Marked',
      r.check_in || '',
      r.check_out || '',
      hoursWorked(r.check_in, r.check_out),
      r.note || '',
    ])
    const lines = [headers.join(','), ...rows.map((row) => row.map((v) => `"${v}"`).join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `attendance_${date}.csv`
    a.click()
  }

  const marked  = records.filter((r) => r.status).length
  const attPct  = records.length ? Math.round((stats.present + stats.wfh + stats.half_day) / records.length * 100) : 0

  // Build a date→status map for the logged in user
  const attendanceMap = useMemo(() => {
    const map = {}
    monthRecords.forEach((a) => {
      if (a.employee_id === user?.id) {
        map[a.date] = a.status
      }
    })
    return map
  }, [monthRecords, user?.id])

  return (
    <>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Attendance</h2>
            <p className="text-sm text-gray-500 mt-0.5">{formatDisplayDate(date)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const empToMark = records.find(r => r.id === user?.id) || employees[0] || { id: user?.id || 'emp_1', full_name: user?.full_name || 'Employee', department: 'Operations' }
                setModalEmp(empToMark)
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-xs"
            >
              <UserCheck className="w-4 h-4" /> Mark Today&apos;s Attendance
            </button>
            {role !== 'employee' && (
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button onClick={() => setView('daily')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                    ${view === 'daily' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  Daily
                </button>
                <button onClick={() => setView('monthly')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5
                    ${view === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Calendar className="w-3.5 h-3.5" /> Monthly
                </button>
              </div>
            )}
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Attendance view filters for Employee */}
        {role === 'employee' && (
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg overflow-hidden shrink-0 w-fit bg-white">
            <button onClick={() => setDate((d) => offsetDate(d, -30))}
              className="px-2.5 py-2 hover:bg-gray-50 text-slate-500 hover:text-slate-700 transition-colors border-r border-gray-200">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="month"
              value={date.slice(0, 7)}
              onChange={(e) => setDate(e.target.value + '-01')}
              className="px-3 py-2 text-sm text-slate-700 focus:outline-none bg-transparent"
            />
            <button onClick={() => setDate((d) => offsetDate(d, 30))}
              className="px-2.5 py-2 hover:bg-gray-50 text-slate-500 hover:text-slate-700 transition-colors border-l border-gray-200">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stat cards for Admin/HR/Managers */}
        {role !== 'employee' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { key: 'present',    icon: UserCheck, label: 'Present',    iconBg: 'bg-green-100',    iconColor: 'text-green-600' },
              { key: 'absent',     icon: UserX,     label: 'Absent',     iconBg: 'bg-red-100',      iconColor: 'text-red-600' },
              { key: 'late',       icon: Clock,     label: 'Late',       iconBg: 'bg-amber-100',    iconColor: 'text-amber-600' },
              { key: 'wfh',        icon: Monitor,   label: 'WFH',        iconBg: 'bg-blue-100',     iconColor: 'text-blue-600' },
              { key: 'half_day',   icon: Clock,     label: 'Half Day',   iconBg: 'bg-purple-100',   iconColor: 'text-purple-600' },
              { key: 'weekly_off', icon: Clock,     label: 'Weekly Off', iconBg: 'bg-indigo-100',   iconColor: 'text-indigo-600' },
            ].map(({ key, icon, label, iconBg, iconColor }) => (
              <button key={key} onClick={() => setTab(tab === key ? 'all' : key)}
                className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3 text-left transition-all
                  ${tab === key ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className={`${iconBg} rounded-lg p-2 shrink-0`}>
                  {createElement(icon, { className: `w-5 h-5 ${iconColor}` })}
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats[key]}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {view === 'monthly' && (
          <MonthlyCalendar
            attendanceMap={attendanceMap}
            year={calYear}
            month={calMonth}
          />
        )}

        {view === 'daily' && role !== 'employee' && (
          <>
            {/* Date nav + filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden shrink-0">
                <button onClick={() => setDate((d) => offsetDate(d, -1))}
                  className="px-2.5 py-2 hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors border-r border-gray-200">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="px-3 py-2 text-sm text-gray-700 focus:outline-none bg-transparent" />
                <button onClick={() => setDate((d) => offsetDate(d, 1))}
                  className="px-2.5 py-2 hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors border-l border-gray-200">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="relative flex-1 min-w-40">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search employee…"
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400" />
              </div>

              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700
                  focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>

              <div className="ml-auto flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">{marked}/{records.length} marked</span>
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${attPct}%` }} />
                </div>
                <span className="text-sm font-semibold text-gray-700">{attPct}%</span>
              </div>
            </div>

            {/* Status tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              {STATUS_TABS.map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${tab === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {TAB_LABELS[t]}
                  {t !== 'all' && (
                    <span className={`ml-1.5 text-xs ${tab === t ? 'text-blue-200' : 'text-gray-400'}`}>
                      {stats[t]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-in</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-out</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      {canAmend && <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={canAmend ? 7 : 6} className="text-center py-16 text-sm text-gray-400">Loading…</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={canAmend ? 7 : 6} className="text-center py-16 text-sm text-gray-400">No records found.</td></tr>
                    ) : filtered.map((rec) => {
                      const meta = rec.status ? STATUS_META[rec.status] : null
                      return (
                        <tr key={rec.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <span className="text-blue-700 text-xs font-semibold">{initials(rec.full_name)}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{rec.full_name}</p>
                                <p className="text-xs text-gray-400 font-mono">{rec.employee_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-sm text-gray-700">{rec.department}</p>
                            <p className="text-xs text-gray-400">{rec.designation}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-sm font-medium ${rec.check_in ? (rec.status === 'late' ? 'text-amber-600' : 'text-gray-900') : 'text-gray-300'}`}>
                              {rec.check_in || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-sm ${rec.check_out ? 'text-gray-900' : 'text-gray-300'}`}>
                              {rec.check_out || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-sm text-gray-700">{hoursWorked(rec.check_in, rec.check_out)}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            {meta ? (
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${meta.dot}`} />
                                  {meta.label}
                                </span>
                                {rec.note && <span className="text-xs text-gray-400 truncate max-w-24" title={rec.note}>{rec.note}</span>}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300 italic">Not marked</span>
                            )}
                          </td>
                          {(canAmend || rec.id === user?.id) && (
                            <td className="px-5 py-3.5 text-right">
                              <button onClick={() => setModalEmp(rec)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100
                                  text-xs font-semibold transition-colors ml-auto shadow-2xs">
                                <Edit2 className="w-3.5 h-3.5" />
                                {rec.status ? 'Edit' : 'Mark'}
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">Showing {filtered.length} of {records.length} employees</p>
                <p className="text-xs text-gray-400">{date}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <MarkAttendanceModal
        open={!!modalEmp}
        employee={modalEmp}
        onClose={() => setModalEmp(null)}
        onSave={handleSave}
      />
    </>
  )
}
