import { useState, useEffect, useCallback, useMemo } from 'react'
import { X, MapPin, Navigation, AlertTriangle, CheckCircle2, LocateFixed, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { getCompanyLocation, verifyGeofence, formatDistance } from '../../utils/geofence'
import { useAuthStore } from '../../stores/authStore'

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'text-green-600' },
  { value: 'absent', label: 'Absent', color: 'text-red-600' },
  { value: 'late', label: 'Late', color: 'text-amber-600' },
  { value: 'wfh', label: 'WFH', color: 'text-blue-600' },
  { value: 'half_day', label: 'Half Day', color: 'text-purple-600' },
]

export default function MarkAttendanceModal({ open, onClose, employee, onSave }) {
  const { user, role } = useAuthStore()
  const isManagerRole = ['super_admin', 'hr', 'manager', 'rm', 'accounts', 'finance', 'admin'].includes(role)
  const isSelf = user?.id === employee?.id
  const canUseOverride = isManagerRole && !isSelf

  const [status, setStatus] = useState('present')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [note, setNote] = useState('')
  const [adminOverride, setAdminOverride] = useState(false)

  // Geofence GPS location states
  const [userCoords, setUserCoords] = useState(null)
  const [geofenceResult, setGeofenceResult] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')

  // Memoize companyLocation to prevent infinite re-render loop
  const companyLocation = useMemo(() => getCompanyLocation(), [])

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000
        const lon = Math.round(pos.coords.longitude * 10000) / 10000
        setUserCoords({ latitude: lat, longitude: lon })
        const res = verifyGeofence(lat, lon, companyLocation)
        setGeofenceResult(res)
        setLocating(false)
      },
      (err) => {
        setLocationError(`GPS error: ${err.message}`)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [companyLocation])

  const empId = employee?.id
  const empStatus = employee?.status
  const empCheckIn = employee?.check_in
  const empCheckOut = employee?.check_out
  const empNote = employee?.note

  useEffect(() => {
    if (open && empId) {
      const timer = setTimeout(() => {
        setAdminOverride(false)
        setStatus(empStatus ?? 'present')
        setCheckIn(empCheckIn ?? (new Date().toTimeString().slice(0, 5)))
        setCheckOut(empCheckOut ?? '')
        setNote(empNote ?? '')
        detectLocation()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [open, empId, empStatus, empCheckIn, empCheckOut, empNote, detectLocation])

  if (!open || !employee) return null

  const simulateOfficeLocation = () => {
    const lat = companyLocation.latitude
    const lon = companyLocation.longitude
    setUserCoords({ latitude: lat, longitude: lon })
    const res = verifyGeofence(lat, lon, companyLocation)
    setGeofenceResult(res)
    setLocationError('')
  }

  const isOutside = geofenceResult && !geofenceResult.isInside
  const isHardBlocked = status !== 'absent' && status !== 'wfh' && isOutside && !adminOverride

  function handleSubmit(e) {
    e.preventDefault()

    if (isHardBlocked) {
      alert(`Attendance Check-In Blocked!\n\nYou are currently ${formatDistance(geofenceResult.distanceKm)} away from ${companyLocation.name}.\nAttendance can ONLY be marked when inside the mandatory ${companyLocation.radiusKm} km radius.`)
      return
    }

    const overrideTag = adminOverride ? ` [${role.toUpperCase()} Admin Override]` : ''
    const gpsTag = geofenceResult ? `(GPS: ${formatDistance(geofenceResult.distanceKm)} from office)` : ''

    onSave({
      ...employee,
      status,
      check_in: checkIn,
      check_out: checkOut,
      note: note ? `${note} ${gpsTag}${overrideTag}` : `${gpsTag}${overrideTag}`.trim(),
      check_in_lat: userCoords?.latitude,
      check_in_lon: userCoords?.longitude,
      distance_km: geofenceResult?.distanceKm,
      geofence_verified: geofenceResult?.isInside || false,
    })
    onClose()
  }

  const initials = employee.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
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

          {/* Status Selection */}
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

          {/* Geofence Distance Verification Widget */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                <span>Geofence Location ({companyLocation.radiusKm} km Radius)</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={simulateOfficeLocation}
                  className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded border border-emerald-300 transition-colors"
                  title="Simulate GPS inside office (0.05 km)"
                >
                  📍 Inside Office (0.05 km)
                </button>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locating}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs"
                >
                  {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
                  {locating ? 'GPS...' : 'Refresh'}
                </button>
              </div>
            </div>

            {locating ? (
              <div className="flex items-center justify-center py-2 text-xs text-slate-500 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Checking GPS distance from {companyLocation.name}...</span>
              </div>
            ) : geofenceResult ? (
              <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                geofenceResult.isInside
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-1.5">
                    {geofenceResult.isInside ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>
                      {geofenceResult.isInside ? 'Inside 1.0 km Office Geofence' : 'Outside 1.0 km Office Geofence'}
                    </span>
                  </div>
                  <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${
                    geofenceResult.isInside ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-rose-100 text-rose-900 border-rose-300'
                  }`}>
                    {formatDistance(geofenceResult.distanceKm)}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {geofenceResult.isInside
                    ? `Verified! You are ${formatDistance(geofenceResult.distanceKm)} from ${companyLocation.name}. Attendance check-in is allowed.`
                    : `⛔ Check-In Blocked: You are ${formatDistance(geofenceResult.distanceKm)} away from ${companyLocation.name}. Mandatory radius is ${companyLocation.radiusKm} km.`}
                </p>
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Company Location: <strong>{companyLocation.name}</strong></span>
                <span className="font-mono">Radius: {companyLocation.radiusKm} km</span>
              </div>
            )}

            {locationError && (
              <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded border border-rose-200 font-medium">
                {locationError}
              </p>
            )}

            {canUseOverride && isOutside && (
              <label className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg cursor-pointer text-xs font-semibold text-amber-950">
                <input
                  type="checkbox"
                  checked={adminOverride}
                  onChange={(e) => setAdminOverride(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <span>Authorize {role.toUpperCase()} Admin Override (Allow off-site attendance for employee)</span>
              </label>
            )}
          </div>

          {/* Hard Block Banner Alert if Outside 1km */}
          {isHardBlocked && (
            <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-center gap-2 font-semibold">
              <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" />
              <span>Attendance check-in is HARD BLOCKED outside the 1.0 km radius.</span>
            </div>
          )}

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
          <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isHardBlocked}
              className={`px-5 py-2 rounded-lg text-white text-sm font-semibold transition-all shadow-xs ${
                isHardBlocked
                  ? 'bg-gray-400 cursor-not-allowed opacity-60'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isHardBlocked ? 'Blocked (Outside 1km)' : 'Save Attendance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
