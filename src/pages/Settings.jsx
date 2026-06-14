import { useState } from 'react'
import {
  Building2, Users, CalendarDays, Wallet, Bell,
  Save, Plus, Trash2, Edit2, X, Check,
  Mail, Shield, ToggleLeft, ToggleRight, ChevronRight,
  Globe, Clock, IndianRupee, Loader2, AlertCircle,
} from 'lucide-react'
import {
  useUsers, useUpdateUserRole,
  useToggleUserStatus, useDeleteUser,
} from '../hooks/useUsers'

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

function CompanySettings() {
  const [form, setForm] = useState({
    name: 'CareerMap Solutions',
    legal_name: 'CareerMap Solutions Pvt. Ltd.',
    gstin: '27AABCC1234F1Z5',
    pan: 'AABCC1234F',
    address: '5th Floor, Infinity Tower, BKC, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400051',
    phone: '+91 22 4567 8900',
    email: 'hr@careermap.in',
    website: 'www.careermap.in',
    fiscal_year: 'April–March',
    timezone: 'Asia/Kolkata (IST)',
    date_format: 'DD/MM/YYYY',
  })
  const [saved, setSaved] = useState(false)

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); setSaved(false) }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

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

      <SaveBar onSave={handleSave} saved={saved} />
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
  const [types, setTypes] = useState(SEED_LEAVE_TYPES)
  const [editId, setEditId] = useState(null)
  const [editDays, setEditDays] = useState('')
  const [saved, setSaved] = useState(false)

  function startEdit(lt) { setEditId(lt.id); setEditDays(String(lt.days)) }
  function saveEdit(id) {
    setTypes((t) => t.map((lt) => lt.id === id ? { ...lt, days: Number(editDays) } : lt))
    setEditId(null)
  }

  function toggleCarry(id) {
    setTypes((t) => t.map((lt) => lt.id === id ? { ...lt, carry_forward: !lt.carry_forward } : lt))
  }

  function togglePaid(id) {
    setTypes((t) => t.map((lt) => lt.id === id ? { ...lt, paid: !lt.paid } : lt))
  }

  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="space-y-6">
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
  const [form, setForm] = useState({
    pf_employee: 12,
    pf_employer: 12,
    esi_employee: 0.75,
    esi_employer: 3.25,
    esi_threshold: 21000,
    pt_state: 'Maharashtra',
    pt_slab1_limit: 10000,
    pt_slab1_amount: 0,
    pt_slab2_limit: 99999,
    pt_slab2_amount: 200,
    pay_day: 'Last working day',
    payslip_lock: true,
  })
  const [saved, setSaved] = useState(false)

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); setSaved(false) }
  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

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
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left
                  ${tab === id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
                  }`}>
                <Icon className={`w-4 h-4 ${tab === id ? 'text-blue-600' : 'text-gray-400'}`} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar */}
        <div className="lg:hidden w-full -mx-0 mb-2">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0
                  ${tab === id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
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
