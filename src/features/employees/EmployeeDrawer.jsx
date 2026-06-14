import { X, Mail, Phone, Building2, Briefcase, Calendar, BadgeCheck, FileText, Edit2, Users } from 'lucide-react'

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

export default function EmployeeDrawer({ employee, onClose, onEdit }) {
  if (!employee) return null

  const initials = employee.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

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

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-gray-500" />
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
