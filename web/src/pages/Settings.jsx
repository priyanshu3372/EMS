import { useState } from 'react'
import {
  Building2, Users, CalendarDays, Wallet, Bell,
  Save, Plus, Trash2, Edit2, X, Check,
  Mail, Shield, ToggleLeft, ToggleRight, ChevronRight,
  Globe, Clock, IndianRupee, Loader2, AlertCircle, MapPin, Compass, Navigation, LocateFixed, ShieldCheck
} from 'lucide-react'
import {
  useUsers, useUpdateUserRole,
  useToggleUserStatus, useDeleteUser,
} from '../hooks/useUsers'
import WeeklyOffPicker from '../features/settings/WeeklyOffPicker'
import { useAuthStore } from '../stores/authStore'
import {
  useCompanySettings, useSaveCompany,
  usePayrollSettings, useSavePayroll,
  useGeofences, useSaveGeofence,
  useLeaveTypes, useUpdateLeaveType,
} from '../hooks/useSettings'

// ─── Shared input styles ──────────────────────────────────────────────────────

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400'
const inpSm = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900'

function Field({ label, hint, children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  )
}

function SaveBar({ onSave, saved }) {
  return (
    <div className="flex justify-end pt-4">
      <button onClick={onSave}
        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
        {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0
        ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
        ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

// ─── Company Settings ─────────────────────────────────────────────────────────

const EMPTY_COMPANY = {
  name: '', legal_name: '', gstin: '', pan: '', address: '',
  city: '', state: '', pincode: '', phone: '', email: '', website: '',
  timezone: '', date_format: 'DD/MM/YYYY',
}

const EMPTY_GEOFENCE = { name: 'Head Office', latitude: '', longitude: '', radiusKm: '' }

function CompanySettings() {
  // Empty, not invented. The old defaults were a plausible-looking Mumbai
  // address that had never been entered by anyone — so the form always looked
  // filled in, and nobody noticed it was never being saved.
  const { data: company, isLoading } = useCompanySettings()
  const { data: geofences } = useGeofences()
  const saveCompany = useSaveCompany()
  const saveGeofence = useSaveGeofence()

  const [saved, setSaved] = useState(false)

  /**
   * Server data until the user types, then their edits.
   *
   * Derived during render rather than copied into state by an effect. Copying
   * causes a second render on every fetch, and — worse — a refetch that lands
   * mid-edit would overwrite what the user was typing. A null draft means
   * "nothing edited yet", so the freshest server value always shows.
   */
  const [companyDraft, setCompanyDraft] = useState(null)
  const form = companyDraft ?? { ...EMPTY_COMPANY, ...(company ?? {}) }

  const [geoDraft, setGeoDraft] = useState(null)
  const office = geofences?.[0]
  const geoConfig =
    geoDraft ??
    (office
      ? {
          name: office.name,
          latitude: office.latitude,
          longitude: office.longitude,
          radiusKm: office.radius_km,
        }
      : EMPTY_GEOFENCE)

  const setForm = (next) =>
    setCompanyDraft((prev) => (typeof next === 'function' ? next(prev ?? form) : next))
  const setGeoConfig = (next) =>
    setGeoDraft((prev) => (typeof next === 'function' ? next(prev ?? geoConfig) : next))
  const [geoLocating, setGeoLocating] = useState(false)
  const [geoMsg, setGeoMsg] = useState('')

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); setSaved(false) }

  function handleSetCurrentGps() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setGeoLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000
        const lon = Math.round(pos.coords.longitude * 10000) / 10000
        setGeoConfig((prev) => ({ ...prev, latitude: lat, longitude: lon }))
        setGeoMsg('Successfully captured your current GPS coordinates!')
        setGeoLocating(false)
        setTimeout(() => setGeoMsg(''), 4000)
      },
      (err) => {
        alert('Could not detect GPS location: ' + err.message)
        setGeoLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleSaveAll() {
    // Only the fields the server accepts. `fiscal_year` was a display string
    // ("April–March") that belongs to the payroll policy as a month number, so
    // it is not sent from here.
    await saveCompany.mutateAsync({
      name: form.name,
      legalName: form.legal_name || null,
      gstin: form.gstin || null,
      pan: form.pan || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      pincode: form.pincode || null,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      ...(form.date_format ? { dateFormat: form.date_format } : {}),
    })

    if (geoConfig.latitude !== '' && geoConfig.longitude !== '') {
      await saveGeofence.mutateAsync({
        name: geoConfig.name || 'Head Office',
        latitude: Number(geoConfig.latitude),
        longitude: Number(geoConfig.longitude),
        // The form asks for kilometres; the column stores metres.
        radiusMeters: Math.round(Number(geoConfig.radiusKm || 0.2) * 1000),
      })
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) return <p className="text-sm text-gray-500">Loading company settings…</p>

  return (
    <div className="space-y-6">
      <Section title="Company Identity" desc="Basic information about your organisation.">
        <Field label="Company Name" hint="Display name across the platform">
          <input className={inp} value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Legal Name" hint="As registered with authorities">
          <input className={inp} value={form.legal_name} onChange={(e) => set('legal_name', e.target.value)} />
        </Field>
        <Field label="GSTIN">
          <input className={inp} value={form.gstin} onChange={(e) => set('gstin', e.target.value)} />
        </Field>
        <Field label="PAN">
          <input className={inp} value={form.pan} onChange={(e) => set('pan', e.target.value)} />
        </Field>
      </Section>

      <Section title="Address & Contact" desc="Registered office address and contact details.">
        <Field label="Address">
          <input className={inp} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="City / State / PIN">
          <div className="grid grid-cols-3 gap-2">
            <input className={inp} value={form.city}    onChange={(e) => set('city', e.target.value)} placeholder="City" />
            <input className={inp} value={form.state}   onChange={(e) => set('state', e.target.value)} placeholder="State" />
            <input className={inp} value={form.pincode} onChange={(e) => set('pincode', e.target.value)} placeholder="PIN" />
          </div>
        </Field>
        <Field label="Phone">
          <input className={inp} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="HR Email">
          <input type="email" className={inp} value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Website">
          <input className={inp} value={form.website} onChange={(e) => set('website', e.target.value)} />
        </Field>
      </Section>

      {/* ─── Company Geofence Location & Radius Settings ───────────────────── */}
      <Section title="Company Location & Attendance Geofence Map" desc="Set office map coordinates and geofence boundary radius for employee check-in.">
        <Field label="Office Location Name" hint="e.g. BKC Main Office, Headquarters">
          <input
            className={inp}
            value={geoConfig.name}
            onChange={(e) => setGeoConfig((g) => ({ ...g, name: e.target.value }))}
          />
        </Field>

        <Field label="Geofence Boundary Radius" hint="Employees must be within this distance to mark attendance">
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="50"
              className={`${inpSm} w-32 font-bold text-blue-700`}
              value={geoConfig.radiusKm}
              onChange={(e) => setGeoConfig((g) => ({ ...g, radiusKm: Number(e.target.value) || 1.0 }))}
            />
            <span className="text-sm font-semibold text-gray-700">km ({Math.round((geoConfig.radiusKm || 1) * 1000)} meters)</span>
          </div>
        </Field>

        <Field label="Office GPS Coordinates" hint="Exact Latitude & Longitude for distance verification">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Latitude (°N)</label>
                <input
                  type="number"
                  step="0.0001"
                  className={inp}
                  value={geoConfig.latitude}
                  onChange={(e) => setGeoConfig((g) => ({ ...g, latitude: Number(e.target.value) }))}
                  placeholder="e.g. 19.0657"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Longitude (°E)</label>
                <input
                  type="number"
                  step="0.0001"
                  className={inp}
                  value={geoConfig.longitude}
                  onChange={(e) => setGeoConfig((g) => ({ ...g, longitude: Number(e.target.value) }))}
                  placeholder="e.g. 72.8686"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetCurrentGps}
                disabled={geoLocating}
                className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {geoLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5 text-blue-400" />}
                {geoLocating ? 'Detecting GPS...' : 'Set Office Location via My Current GPS'}
              </button>
            </div>

            {geoMsg && (
              <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                ✓ {geoMsg}
              </p>
            )}
          </div>
        </Field>

        {/* Interactive Map Visualizer */}
        <div className="py-3">
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-white relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                <span className="font-bold text-sm text-slate-100">{geoConfig.name} Map Geofence</span>
              </div>
              <span className="text-xs font-mono bg-blue-600/30 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/40">
                Radius: {geoConfig.radiusKm} km
              </span>
            </div>

            {/* Simulated Vector Map View */}
            <div className="h-44 rounded-xl bg-slate-950/80 border border-slate-800 relative flex items-center justify-center overflow-hidden">
              {/* Map grid lines */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />

              {/* 1.0 km Geofence Outer Circle */}
              <div className="w-36 h-36 rounded-full border-2 border-dashed border-blue-400/60 bg-blue-500/10 flex items-center justify-center animate-pulse">
                <div className="w-24 h-24 rounded-full border border-blue-400/40 bg-blue-500/15 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-lg animate-bounce" />
                </div>
              </div>

              {/* Map Labels */}
              <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs px-2 py-1 rounded text-[10px] font-mono text-slate-300 border border-slate-700">
                LAT: {geoConfig.latitude}° | LON: {geoConfig.longitude}°
              </div>
              <div className="absolute bottom-2 right-2 bg-blue-950/80 backdrop-blur-xs px-2 py-1 rounded text-[10px] font-semibold text-blue-300 border border-blue-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> 1.0 km Boundary Enforced
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-2">
              📍 Employees outside this <strong className="text-slate-200">{geoConfig.radiusKm} km radius</strong> will be prevented from marking present attendance unless granted WFH or manager override.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Regional Settings" desc="Timezone, date format, and financial year.">
        <Field label="Financial Year">
          <select className={inp} value={form.fiscal_year} onChange={(e) => set('fiscal_year', e.target.value)}>
            <option>April–March</option>
            <option>January–December</option>
          </select>
        </Field>
        <Field label="Timezone">
          <select className={inp} value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
            <option>Asia/Kolkata (IST)</option>
            <option>Asia/Dubai (GST)</option>
            <option>UTC</option>
          </select>
        </Field>
        <Field label="Date Format">
          <select className={inp} value={form.date_format} onChange={(e) => set('date_format', e.target.value)}>
            <option>DD/MM/YYYY</option>
            <option>MM/DD/YYYY</option>
            <option>YYYY-MM-DD</option>
          </select>
        </Field>
      </Section>

      <SaveBar onSave={handleSaveAll} saved={saved} />
    </div>
  )
}

// ─── Users & Roles ────────────────────────────────────────────────────────────

const ROLES = ['super_admin', 'admin', 'hr', 'manager', 'rm', 'accounts', 'employee']
const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  hr:          'HR',
  manager:     'Manager',
  rm:          'Reporting Manager',
  accounts:    'Accounts',
  employee:    'Employee',
}
const ROLE_COLORS = {
  super_admin:   'bg-purple-100 text-purple-700',
  admin:         'bg-indigo-100 text-indigo-700',
  hr:            'bg-blue-100 text-blue-700',
  manager:       'bg-amber-100 text-amber-700',
  rm:            'bg-orange-100 text-orange-700',
  accounts:      'bg-teal-100 text-teal-700',
  employee:      'bg-gray-100 text-gray-600',
}

function UsersSettings() {
  const [editId, setEditId] = useState(null)
  const [editRole, setEditRole] = useState('')

  const { data: users = [], isLoading, isError } = useUsers()
  const updateRole = useUpdateUserRole()
  const toggleStatus = useToggleUserStatus()
  const deleteUser = useDeleteUser()

  function startEdit(user) { setEditId(user.id); setEditRole(user.role) }

  async function saveEdit(userId) {
    try {
      await updateRole.mutateAsync({ user_id: userId, role: editRole })
      setEditId(null)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleToggleStatus(user) {
    try {
      await toggleStatus.mutateAsync({ user_id: user.id, currentStatus: user.status })
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDelete(userId) {
    if (!window.confirm('Remove this user? They will lose all access immediately.')) return
    try {
      await deleteUser.mutateAsync({ user_id: userId })
    } catch (err) {
      console.error(err)
    }
  }

  const initials = (name) => (name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="space-y-6">
      <Section
        title="Manage Users"
        desc={isLoading ? 'Loading…' : `${users.length} user${users.length !== 1 ? 's' : ''} in your organisation.`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading users…
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4" /> Failed to load users.
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['User', 'Role', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-blue-700 text-xs font-semibold">{initials(user.full_name)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.full_name || '—'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {editId === user.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className={`${inpSm} py-1 bg-white text-xs`}
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                          <button
                            onClick={() => saveEdit(user.id)}
                            disabled={updateRole.isPending}
                            className="p-1 rounded bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                          >
                            {updateRole.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => setEditId(null)} className="p-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ROLE_LABELS[user.role] ?? user.role}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {user.status === 'invited'
                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Invited</span>
                        : <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {user.status ?? 'active'}
                          </span>
                      }
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(user)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit role"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {user.status !== 'invited' && (
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={toggleStatus.isPending}
                            className={`p-1.5 rounded-lg transition-colors text-gray-400
                              ${user.status === 'active' ? 'hover:bg-amber-50 hover:text-amber-600' : 'hover:bg-green-50 hover:text-green-600'}`}
                            title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {user.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={deleteUser.isPending}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

// ─── Leave Configuration ──────────────────────────────────────────────────────

const SEED_LEAVE_TYPES = [
  { id: 1, name: 'Casual Leave',     code: 'CL',  days: 12, paid: true,  carry_forward: false, applicable: 'all' },
  { id: 2, name: 'Sick Leave',       code: 'SL',  days: 12, paid: true,  carry_forward: false, applicable: 'all' },
  { id: 3, name: 'Earned Leave',     code: 'EL',  days: 18, paid: true,  carry_forward: true,  applicable: 'all' },
  { id: 4, name: 'Maternity Leave',  code: 'ML',  days: 180,paid: true,  carry_forward: false, applicable: 'female' },
  { id: 5, name: 'Paternity Leave',  code: 'PL',  days: 15, paid: true,  carry_forward: false, applicable: 'male' },
  { id: 6, name: 'Work From Home',   code: 'WFH', days: 24, paid: true,  carry_forward: false, applicable: 'all' },
  { id: 7, name: 'Comp Off',         code: 'CO',  days: 5,  paid: true,  carry_forward: true,  applicable: 'all' },
]

function LeaveSettings() {
  const { data: types = [], isLoading } = useLeaveTypes()
  const canEditSettings = useAuthStore((state) => state.can('settings:update'))
  const updateType = useUpdateLeaveType()

  const [editId, setEditId] = useState(null)
  const [editDays, setEditDays] = useState('')
  const [saved, setSaved] = useState(false)

  function startEdit(lt) { setEditId(lt.id); setEditDays(String(lt.days)) }

  // Each toggle saves immediately. The old version changed local state and
  // waited for a Save button that did nothing, so a half-finished edit looked
  // identical to a saved one.
  async function saveEdit(id) {
    await updateType.mutateAsync({ id, annualQuota: Number(editDays) })
    setEditId(null)
  }

  async function toggleCarry(id) {
    const lt = types.find((t) => t.id === id)
    await updateType.mutateAsync({
      id,
      carryForward: !lt.carry_forward,
      // The server refuses carry-forward with a cap of zero, so give it one.
      ...(!lt.carry_forward && !lt.carry_forward_cap ? { carryForwardCap: lt.days || 30 } : {}),
    })
  }

  async function togglePaid(id) {
    const lt = types.find((t) => t.id === id)
    await updateType.mutateAsync({ id, isPaid: !lt.paid })
  }

  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  if (isLoading) return <p className="text-sm text-gray-500">Loading leave types…</p>

  return (
    <div className="space-y-6">
      {/*
        Working days first, because everything below depends on it: a quota of
        twelve days means something different in a five-day week than a six-day
        one.

        Shown only to somebody who can change it. HR manages leave TYPES but not
        company settings, and rendering a section that 403s on load would look
        like a broken page rather than a permission they do not have.
      */}
      {canEditSettings && (
        <Section title="Working Days" desc="Which days the company is closed. Leave is not charged for these.">
          <WeeklyOffPicker />
        </Section>
      )}

      <Section title="Leave Types" desc="Configure leave quotas, carry-forward rules and eligibility.">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Leave Type', 'Code', 'Days / Year', 'Paid', 'Carry Forward', 'Applicable To', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.map((lt) => (
                <tr key={lt.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{lt.name}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{lt.code}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {editId === lt.id ? (
                      <div className="flex items-center gap-2">
                        <input type="number" min="1" max="365" value={editDays}
                          onChange={(e) => setEditDays(e.target.value)}
                          className={`${inpSm} w-20 py-1`} />
                        <button onClick={() => saveEdit(lt.id)} className="p-1 rounded bg-green-100 text-green-600 hover:bg-green-200"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditId(null)} className="p-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-700">{lt.days} days</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <Toggle checked={lt.paid} onChange={() => togglePaid(lt.id)} />
                  </td>
                  <td className="px-4 py-3.5">
                    <Toggle checked={lt.carry_forward} onChange={() => toggleCarry(lt.id)} />
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-500 capitalize">{lt.applicable}</td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => startEdit(lt)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <SaveBar onSave={handleSave} saved={saved} />
    </div>
  )
}

// ─── Payroll Configuration ────────────────────────────────────────────────────

function PayrollSettings() {
  const { data: policy, isLoading } = usePayrollSettings()
  const savePayroll = useSavePayroll()

  const [saved, setSaved] = useState(false)

  // Same pattern as the Company tab: derive, do not copy. See the note there.
  const [draft, setDraft] = useState(null)
  const form = draft ?? policy ?? {}
  const setForm = (next) =>
    setDraft((prev) => (typeof next === 'function' ? next(prev ?? form) : next))

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); setSaved(false) }

  async function handleSave() {
    // Numbers, not the strings an input gives back. Sending "12" where a number
    // is expected is a 422 from the validator, which is better than the old
    // behaviour of accepting anything and storing nothing.
    await savePayroll.mutateAsync({
      pfEmployeeRate: Number(form.pf_employee),
      pfEmployerRate: Number(form.pf_employer),
      esiEmployeeRate: Number(form.esi_employee),
      esiEmployerRate: Number(form.esi_employer),
      esiThreshold: Number(form.esi_threshold),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) return <p className="text-sm text-gray-500">Loading payroll settings…</p>

  return (
    <div className="space-y-6">
      <Section title="Provident Fund (PF)" desc="PF contribution rates as per EPFO guidelines.">
        <Field label="Employee Contribution" hint="% of Basic salary">
          <div className="flex items-center gap-2">
            <input type="number" className={`${inpSm} w-24`} value={form.pf_employee}
              onChange={(e) => set('pf_employee', e.target.value)} />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </Field>
        <Field label="Employer Contribution" hint="% of Basic salary">
          <div className="flex items-center gap-2">
            <input type="number" className={`${inpSm} w-24`} value={form.pf_employer}
              onChange={(e) => set('pf_employer', e.target.value)} />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </Field>
      </Section>

      <Section title="ESI (Employee State Insurance)" desc="Applicable if gross salary ≤ threshold.">
        <Field label="Employee Contribution">
          <div className="flex items-center gap-2">
            <input type="number" className={`${inpSm} w-24`} value={form.esi_employee}
              onChange={(e) => set('esi_employee', e.target.value)} step="0.01" />
            <span className="text-sm text-gray-500">% of Gross</span>
          </div>
        </Field>
        <Field label="Employer Contribution">
          <div className="flex items-center gap-2">
            <input type="number" className={`${inpSm} w-24`} value={form.esi_employer}
              onChange={(e) => set('esi_employer', e.target.value)} step="0.01" />
            <span className="text-sm text-gray-500">% of Gross</span>
          </div>
        </Field>
        <Field label="Applicable Threshold" hint="ESI not deducted above this gross salary">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">₹</span>
            <input type="number" className={`${inpSm} w-32`} value={form.esi_threshold}
              onChange={(e) => set('esi_threshold', e.target.value)} />
            <span className="text-sm text-gray-400">/ month</span>
          </div>
        </Field>
      </Section>

      <Section title="Professional Tax (PT)" desc="State-wise PT slab configuration.">
        <Field label="State">
          <select className={`${inpSm} bg-white`} value={form.pt_state} onChange={(e) => set('pt_state', e.target.value)}>
            {['Maharashtra', 'Karnataka', 'Gujarat', 'West Bengal', 'Andhra Pradesh', 'Tamil Nadu'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="PT Slab 1" hint="Salary ≤ limit">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Up to ₹</span>
            <input type="number" className={`${inpSm} w-28`} value={form.pt_slab1_limit}
              onChange={(e) => set('pt_slab1_limit', e.target.value)} />
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">₹</span>
            <input type="number" className={`${inpSm} w-24`} value={form.pt_slab1_amount}
              onChange={(e) => set('pt_slab1_amount', e.target.value)} />
            <span className="text-xs text-gray-500">/ month</span>
          </div>
        </Field>
        <Field label="PT Slab 2" hint="Salary > slab 1 limit">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Above ₹{form.pt_slab1_limit.toLocaleString()}</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">₹</span>
            <input type="number" className={`${inpSm} w-24`} value={form.pt_slab2_amount}
              onChange={(e) => set('pt_slab2_amount', e.target.value)} />
            <span className="text-xs text-gray-500">/ month</span>
          </div>
        </Field>
      </Section>

      <Section title="Payroll Schedule" desc="When payroll is processed and payslips are released.">
        <Field label="Pay Day">
          <select className={`${inpSm} bg-white`} value={form.pay_day} onChange={(e) => set('pay_day', e.target.value)}>
            {['Last working day', '25th of the month', '28th of the month', '1st of next month'].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Lock Payslip Editing" hint="Prevent changes after payroll is processed">
          <Toggle checked={form.payslip_lock} onChange={(v) => set('payslip_lock', v)} />
        </Field>
      </Section>

      <SaveBar onSave={handleSave} saved={saved} />
    </div>
  )
}

// ─── Notification Settings ────────────────────────────────────────────────────

const NOTIF_GROUPS = [
  {
    title: 'Leave Notifications',
    items: [
      { key: 'leave_applied',   label: 'Leave request submitted',     desc: 'When an employee submits a leave request' },
      { key: 'leave_approved',  label: 'Leave approved',              desc: 'When a manager or HR approves a leave' },
      { key: 'leave_rejected',  label: 'Leave rejected',              desc: 'When a leave request is rejected' },
      { key: 'leave_reminder',  label: 'Upcoming leave reminder',     desc: '24 hours before approved leave begins' },
    ],
  },
  {
    title: 'Attendance Notifications',
    items: [
      { key: 'missed_checkin',  label: 'Missed check-in alert',       desc: 'If employee hasn\'t checked in by 11 AM' },
      { key: 'late_arrival',    label: 'Late arrival notification',    desc: 'When check-in is after 10 AM' },
    ],
  },
  {
    title: 'Payroll Notifications',
    items: [
      { key: 'payroll_run',     label: 'Payroll processed',           desc: 'When monthly payroll run is completed' },
      { key: 'payslip_ready',   label: 'Payslip available',           desc: 'When payslip is generated for the employee' },
    ],
  },
  {
    title: 'System Notifications',
    items: [
      { key: 'new_employee',    label: 'New employee onboarded',      desc: 'When a new employee is added to the system' },
      { key: 'doc_uploaded',    label: 'Document uploaded',           desc: 'When a new company document is uploaded' },
    ],
  },
]

function NotifSettings() {
  const [settings, setSettings] = useState(() => {
    const out = {}
    NOTIF_GROUPS.forEach((g) => g.items.forEach((i) => { out[i.key] = { email: true, inapp: true } }))
    return out
  })
  const [saved, setSaved] = useState(false)

  function toggle(key, channel) {
    setSettings((s) => ({ ...s, [key]: { ...s[key], [channel]: !s[key][channel] } }))
    setSaved(false)
  }

  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Bell className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">Configure which events trigger email and in-app notifications for your team.</p>
      </div>

      {NOTIF_GROUPS.map((group) => (
        <Section key={group.title} title={group.title} desc="">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-1 mb-1">
            <div />
            <p className="text-xs font-semibold text-gray-500 text-center uppercase tracking-wider">Email</p>
            <p className="text-xs font-semibold text-gray-500 text-center uppercase tracking-wider">In-App</p>
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {group.items.map((item) => (
              <div key={item.key} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center px-4 py-3.5 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
                <div className="flex justify-center">
                  <Toggle checked={settings[item.key]?.email ?? true} onChange={() => toggle(item.key, 'email')} />
                </div>
                <div className="flex justify-center">
                  <Toggle checked={settings[item.key]?.inapp ?? true} onChange={() => toggle(item.key, 'inapp')} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      ))}

      <SaveBar onSave={handleSave} saved={saved} />
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, desc, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <p className="text-base font-semibold text-gray-900">{title}</p>
        {desc && <p className="text-sm text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <div className="px-6 py-2">{children}</div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'company',      label: 'Company',          icon: Building2 },
  { id: 'users',        label: 'Users & Roles',    icon: Users },
  { id: 'leave',        label: 'Leave Config',     icon: CalendarDays },
  { id: 'payroll',      label: 'Payroll Config',   icon: IndianRupee },
  { id: 'notifications',label: 'Notifications',    icon: Bell },
]

export default function Settings() {
  const [tab, setTab] = useState('company')

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage company configuration, users, and system preferences</p>
      </div>

      <div className="flex gap-6">

        {/* Left nav */}
        <aside className="hidden lg:block w-52 shrink-0">
          <nav className="space-y-0.5">
            {TABS.map((item) => (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left
                  ${tab === item.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
                  }`}>
                <item.icon className={`w-4 h-4 ${tab === item.id ? 'text-blue-600' : 'text-gray-400'}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar */}
        <div className="lg:hidden w-full -mx-0 mb-2">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {TABS.map((item) => (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0
                  ${tab === item.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tab === 'company'       && <CompanySettings />}
          {tab === 'users'         && <UsersSettings />}
          {tab === 'leave'         && <LeaveSettings />}
          {tab === 'payroll'       && <PayrollSettings />}
          {tab === 'notifications' && <NotifSettings />}
        </div>
      </div>
    </div>
  )
}
