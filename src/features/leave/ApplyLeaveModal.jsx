import { useState } from 'react'
import { X, CalendarDays } from 'lucide-react'

const LEAVE_TYPES = [
  { value: 'casual',    label: 'Casual Leave',    max: 12 },
  { value: 'sick',      label: 'Sick Leave',       max: 12 },
  { value: 'earned',    label: 'Earned Leave',     max: 18 },
  { value: 'maternity', label: 'Maternity Leave',  max: 180 },
  { value: 'paternity', label: 'Paternity Leave',  max: 15 },
  { value: 'wfh',       label: 'Work From Home',   max: 24 },
  { value: 'comp_off',  label: 'Compensatory Off', max: 5 },
]

const EMPTY = { leave_type: 'casual', from_date: '', to_date: '', reason: '' }

function workingDays(from, to) {
  if (!from || !to) return 0
  let count = 0
  const d = new Date(from)
  const end = new Date(to)
  while (d <= end) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

export default function ApplyLeaveModal({ open, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  if (!open) return null

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.from_date) e.from_date = 'Required'
    if (!form.to_date) e.to_date = 'Required'
    else if (form.from_date && form.to_date < form.from_date) e.to_date = 'Must be after start date'
    if (!form.reason.trim()) e.reason = 'Required'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    const days = workingDays(form.from_date, form.to_date)
    onSave({ ...form, days, status: 'pending', applied_on: new Date().toISOString().slice(0, 10) })
    setForm(EMPTY)
    onClose()
  }

  const days = workingDays(form.from_date, form.to_date)
  const selectedType = LEAVE_TYPES.find((t) => t.value === form.leave_type)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">

        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Apply for Leave</h2>
            <p className="text-sm text-gray-400 mt-0.5">Submit a new leave request</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Leave type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-600">Leave Type <span className="text-red-400">*</span></label>
            <select value={form.leave_type} onChange={(e) => set('leave_type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white">
              {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-600">From Date <span className="text-red-400">*</span></label>
              <input type="date" value={form.from_date} onChange={(e) => set('from_date', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900
                  ${errors.from_date ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
              {errors.from_date && <p className="text-xs text-red-500">{errors.from_date}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-600">To Date <span className="text-red-400">*</span></label>
              <input type="date" value={form.to_date} min={form.from_date} onChange={(e) => set('to_date', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900
                  ${errors.to_date ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
              {errors.to_date && <p className="text-xs text-red-500">{errors.to_date}</p>}
            </div>
          </div>

          {/* Days calculated */}
          {days > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg">
              <CalendarDays className="w-4 h-4 text-blue-500 shrink-0" />
              <p className="text-sm text-blue-700 font-medium">
                {days} working day{days !== 1 ? 's' : ''} · {selectedType?.label}
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-600">Reason <span className="text-red-400">*</span></label>
            <textarea rows={3} value={form.reason} onChange={(e) => set('reason', e.target.value)}
              placeholder="Briefly describe the reason for your leave…"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                placeholder:text-gray-400 text-gray-900 ${errors.reason ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
            {errors.reason && <p className="text-xs text-red-500">{errors.reason}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
