import { useState } from 'react'
import { X } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'text-green-600' },
  { value: 'absent', label: 'Absent', color: 'text-red-600' },
  { value: 'late', label: 'Late', color: 'text-amber-600' },
  { value: 'wfh', label: 'WFH', color: 'text-blue-600' },
  { value: 'half_day', label: 'Half Day', color: 'text-purple-600' },
]

export default function MarkAttendanceModal({ open, onClose, employee, onSave }) {
  const [status, setStatus] = useState(employee?.status ?? 'present')
  const [checkIn, setCheckIn] = useState(employee?.check_in ?? '')
  const [checkOut, setCheckOut] = useState(employee?.check_out ?? '')
  const [note, setNote] = useState(employee?.note ?? '')

  if (!open || !employee) return null

  function handleSubmit(e) {
    e.preventDefault()
    onSave({ ...employee, status, check_in: checkIn, check_out: checkOut, note })
    onClose()
  }

  const initials = employee.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-blue-700 text-sm font-semibold">{initials}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{employee.full_name}</p>
              <p className="text-xs text-gray-400">{employee.department}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Attendance Status</label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all
                    ${status === opt.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Times — only when not absent */}
          {status !== 'absent' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-600">Check-in Time</label>
                <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-600">Check-out Time</label>
                <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900" />
              </div>
            </div>
          )}

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-600">Note <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Doctor appointment, client visit…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                placeholder:text-gray-400 text-gray-900"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
              Save Attendance
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
