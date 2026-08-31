import { createElement, useState } from 'react'
import {
  X, Mail, Phone, Building2, Briefcase, Calendar, BadgeCheck, FileText, Edit2, Users, IndianRupee,
  Landmark, CheckCircle2, XCircle, ShieldCheck
} from 'lucide-react'
import { useSalaryStructures } from '../../hooks/usePayroll'
import BankVerificationModal from '../payroll/BankVerificationModal'

const STATUS_CLASS = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-red-100 text-red-600',
}

const EMP_TYPE_CLASS = {
  'Full-time': 'bg-blue-100 text-blue-700',
  'Part-time': 'bg-amber-100 text-amber-700',
  Contract: 'bg-purple-100 text-purple-700',
  Intern: 'bg-teal-100 text-teal-700',
}

function computeSalary(ctc) {
  const gross = Math.round((ctc || 0) / 12)
  const basic = Math.round(gross * 0.40)
  const hra = Math.round(basic * 0.50)
  const da = Math.round(basic * 0.10)
  const special = Math.max(0, gross - basic - hra - da)
  const pf = Math.round(basic * 0.12)
  const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0
  const pt = gross > 10000 ? 200 : 0
  const net = Math.max(0, gross - pf - esi - pt)
  return { gross, basic, hra, da, special, pf, esi, pt, net }
}

function fmt(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }

export default function EmployeeDrawer({ employee, onClose, onEdit }) {
  const { data: salaryStructures = [] } = useSalaryStructures()
  const [bankModalOpen, setBankModalOpen] = useState(false)
  const [bankModalMode, setBankModalMode] = useState('review')

  if (!employee) return null

  const initials = employee.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const ssRecord = salaryStructures.find(s => s.employee_id === employee.id || s.profiles?.id === employee.id)
  const ctcVal = employee.ctc || ssRecord?.ctc || 0
  const computed = computeSalary(ctcVal)

  const grossMonthly = ssRecord?.gross ?? computed.gross
  const basic = ssRecord?.basic ?? computed.basic
  const hra = ssRecord?.hra ?? computed.hra
  const da = ssRecord?.da ?? computed.da
  const special = ssRecord?.special_allowance ?? computed.special
  const pf = ssRecord?.pf ?? computed.pf
  const esi = ssRecord?.esi ?? computed.esi
  const pt = ssRecord?.pt ?? computed.pt
  const netMonthly = ssRecord?.net_salary ?? computed.net

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <p className="text-base font-semibold text-gray-900">Employee Profile</p>
          <div className="flex items-center gap-2">
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Profile header */}
          <div className="px-6 py-6 bg-gradient-to-br from-blue-50 to-white border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0">
                <span className="text-white text-xl font-bold">{initials}</span>
              </div>
              <div className="min-w-0 pt-1">
                <h2 className="text-xl font-bold text-gray-900 truncate">{employee.full_name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{employee.designation}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_CLASS[employee.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {employee.status}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${EMP_TYPE_CLASS[employee.employment_type] ?? 'bg-gray-100 text-gray-700'}`}>
                    {employee.employment_type}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="px-6 py-5 space-y-6">

            <Section title="Contact Information">
              <InfoRow icon={Mail} label="Work Email" value={employee.email} />
              <InfoRow icon={Phone} label="Phone" value={employee.phone || '—'} />
            </Section>

            <Section title="Employment Details">
              <InfoRow icon={BadgeCheck} label="Employee ID" value={employee.employee_id} />
              <InfoRow icon={Building2} label="Department" value={employee.department} />
              <InfoRow icon={Briefcase} label="Designation" value={employee.designation} />
              <InfoRow icon={Calendar} label="Date of Joining" value={formatDate(employee.date_of_joining)} />
              <InfoRow icon={Users} label="Reporting Manager" value={employee.reporting_manager_name ? `${employee.reporting_manager_name} (${employee.reporting_manager_designation || 'Manager'})` : '—'} />
            </Section>

            <Section title="Salary & Compensation">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Annual CTC</p>
                    <p className="text-lg font-bold text-slate-900">{fmt(ctcVal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium">Net Take-Home / mo</p>
                    <p className="text-base font-bold text-emerald-600">{fmt(netMonthly)}</p>
                  </div>
                </div>

                <div className="border-t border-slate-200/80 pt-2.5 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Gross / Month:</span> <span className="font-semibold text-slate-700">{fmt(grossMonthly)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Basic Pay:</span> <span className="font-semibold text-slate-700">{fmt(basic)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">HRA:</span> <span className="font-semibold text-slate-700">{fmt(hra)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">DA:</span> <span className="font-semibold text-slate-700">{fmt(da)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Special Allowance:</span> <span className="font-semibold text-slate-700">{fmt(special)}</span>
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Standard Deductions (PF, ESI, PT)</span>
                  <span className="font-bold text-red-500">− {fmt((pf || 0) + (esi || 0) + (pt || 0))}</span>
                </div>
              </div>
            </Section>

            <Section title="Bank Account for Salary Credit">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-slate-900">{employee.bank_name || 'Bank details pending'}</span>
                  </div>
                  <button
                    onClick={() => {
                      setBankModalMode('review')
                      setBankModalOpen(true)
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Verify / Manage
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/80">
                  <div>
                    <span className="text-slate-400">Account No:</span>{' '}
                    <span className="font-mono font-bold text-slate-800">{employee.bank_account || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">IFSC Code:</span>{' '}
                    <span className="font-mono font-semibold text-blue-700">{employee.ifsc || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Status</span>
                  {employee.bank_verification_status === 'verified' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                    </span>
                  )}
                  {(employee.bank_verification_status === 'pending' || !employee.bank_verification_status) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending
                    </span>
                  )}
                  {employee.bank_verification_status === 'rejected' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                      <XCircle className="w-3 h-3 text-rose-600" /> Rejected
                    </span>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Documents">
              <div className="space-y-2">
                {['Offer Letter', 'Aadhaar Card', 'PAN Card'].map((doc) => (
                  <div key={doc} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{doc}</span>
                    </div>
                    <span className="text-xs text-gray-400">Not uploaded</span>
                  </div>
                ))}
              </div>
            </Section>

          </div>
        </div>
      </div>

      <BankVerificationModal
        open={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        profile={employee}
        mode={bankModalMode}
      />
    </>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        {createElement(icon, { className: 'w-4 h-4 text-gray-500' })}
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function formatDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
