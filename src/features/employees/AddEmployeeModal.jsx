import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useEmployees, useCreateEmployee, useUpdateEmployee } from '../../hooks/useEmployees'

const DEPARTMENTS = ['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Marketing', 'Design', 'Product']
const DESIGNATIONS = ['Software Engineer', 'Senior Engineer', 'Tech Lead', 'Manager', 'Senior Manager', 'Director', 'Analyst', 'Executive', 'Intern']
const EMP_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern']
const ROLES = ['employee', 'manager', 'rm', 'hr', 'accounts', 'admin', 'super_admin']

const EMPTY = {
  full_name: '', email: '', password: '', employee_id: '', phone: '',
  department: '', designation: '', employment_type: 'Full-time',
  date_of_joining: '', status: 'active', role: 'employee',
  reporting_manager_id: '', reporting_manager_name: '', reporting_manager_designation: ''
}

export default function AddEmployeeModal({ open, onClose, initial = null, onSave }) {
  const isEdit = !!initial
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const { data: employeesList = [] } = useEmployees()
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...EMPTY, ...initial } : EMPTY)
      setErrors({})
    }
  }, [open, initial])

  if (!open) return null

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }

  function handleManagerSelect(value) {
    if (value === 'none') {
      setForm(f => ({
        ...f,
        reporting_manager_id: null,
        reporting_manager_name: null,
        reporting_manager_designation: null,
      }))
    } else if (value === 'manual') {
      setForm(f => ({
        ...f,
        reporting_manager_id: null,
        reporting_manager_name: '',
        reporting_manager_designation: '',
      }))
    } else {
      const selectedEmp = employeesList.find(emp => emp.id === value)
      if (selectedEmp) {
        setForm(f => ({
          ...f,
          reporting_manager_id: selectedEmp.id,
          reporting_manager_name: selectedEmp.full_name,
          reporting_manager_designation: selectedEmp.designation || 'Manager',
        }))
      }
    }
  }

  function validate() {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Required'
    if (!isEdit) {
      if (!form.email.trim()) e.email = 'Required'
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
      if (!form.password.trim()) e.password = 'Required'
      else if (form.password.length < 6) e.password = 'Min 6 characters'
    }
    if (!form.employee_id.trim()) e.employee_id = 'Required'
    if (!form.department) e.department = 'Required'
    if (!form.designation.trim()) e.designation = 'Required'
    if (!form.date_of_joining) e.date_of_joining = 'Required'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    if (isEdit) {
      await updateEmployee.mutateAsync({
        id: initial.id,
        full_name: form.full_name,
        employee_id: form.employee_id,
        phone: form.phone,
        department: form.department,
        designation: form.designation,
        employment_type: form.employment_type,
        date_of_joining: form.date_of_joining,
        status: form.status,
        role: form.role,
        reporting_manager_id: form.reporting_manager_id || null,
        reporting_manager_name: form.reporting_manager_name || null,
        reporting_manager_designation: form.reporting_manager_designation || null,
      })
    } else {
      await createEmployee.mutateAsync(form)
    }

    onSave()
    onClose()
  }

  const saving = createEmployee.isPending || updateEmployee.isPending
  const saveError = createEmployee.error?.message || updateEmployee.error?.message

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">

        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Employee' : 'Add New Employee'}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{isEdit ? 'Update employee information' : 'Creates a login account for the employee'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {saveError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{saveError}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" error={errors.full_name} required>
              <input type="text" placeholder="e.g. Priya Sharma"
                value={form.full_name} onChange={(e) => set('full_name', e.target.value)}
                className={inp(errors.full_name)} />
            </Field>
            <Field label="Employee ID" error={errors.employee_id} required>
              <input type="text" placeholder="e.g. CMS-1042"
                value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)}
                className={inp(errors.employee_id)} />
            </Field>
          </div>

          {!isEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Work Email" error={errors.email} required>
                <input type="email" placeholder="priya@careermap.in"
                  value={form.email} onChange={(e) => set('email', e.target.value)}
                  className={inp(errors.email)} />
              </Field>
              <Field label="Initial Password" error={errors.password} required>
                <input type="password" placeholder="Min 6 characters"
                  value={form.password} onChange={(e) => set('password', e.target.value)}
                  className={inp(errors.password)} />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone Number" error={errors.phone}>
              <input type="tel" placeholder="+91 98765 43210"
                value={form.phone} onChange={(e) => set('phone', e.target.value)}
                className={inp(errors.phone)} />
            </Field>
            <Field label="Role" error={errors.role}>
              <select value={form.role} onChange={(e) => set('role', e.target.value)} className={inp()}>
                {ROLES.map((r) => <option key={r} value={r}>{r === 'rm' ? 'Reporting Manager' : r.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Department" error={errors.department} required>
              <select value={form.department} onChange={(e) => set('department', e.target.value)} className={inp(errors.department)}>
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Designation" error={errors.designation} required>
              <input type="text" placeholder="e.g. Senior Engineer"
                value={form.designation} onChange={(e) => set('designation', e.target.value)}
                className={inp(errors.designation)} list="designations-list" />
              <datalist id="designations-list">
                {DESIGNATIONS.map((d) => <option key={d} value={d} />)}
              </datalist>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Date of Joining" error={errors.date_of_joining} required>
              <input type="date" value={form.date_of_joining}
                onChange={(e) => set('date_of_joining', e.target.value)}
                className={inp(errors.date_of_joining)} />
            </Field>
            <Field label="Employment Type">
              <select value={form.employment_type} onChange={(e) => set('employment_type', e.target.value)} className={inp()}>
                {EMP_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inp()}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>

          {/* Reporting Manager Section */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Reporting Hierarchy</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Select Reporting Manager">
                <select
                  value={form.reporting_manager_id === null ? 'none' : (form.reporting_manager_id || (form.reporting_manager_name ? 'manual' : 'none'))}
                  onChange={(e) => handleManagerSelect(e.target.value)}
                  className={inp()}
                >
                  <option value="none">None / No Manager</option>
                  <option value="manual">Manual Entry...</option>
                  {employeesList.filter(emp => emp.id !== initial?.id).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.designation || emp.role})
                    </option>
                  ))}
                </select>
              </Field>

              {(form.reporting_manager_id === 'manual' || (!form.reporting_manager_id && form.reporting_manager_name !== '' && form.reporting_manager_name !== null)) ? (
                <div className="space-y-4">
                  <Field label="Manager Name" required>
                    <input
                      type="text"
                      placeholder="e.g. Vikram Singh"
                      value={form.reporting_manager_name || ''}
                      onChange={(e) => set('reporting_manager_name', e.target.value)}
                      className={inp()}
                    />
                  </Field>
                  <Field label="Manager Designation">
                    <input
                      type="text"
                      placeholder="e.g. Senior Tech Manager"
                      value={form.reporting_manager_designation || ''}
                      onChange={(e) => set('reporting_manager_designation', e.target.value)}
                      className={inp()}
                    />
                  </Field>
                </div>
              ) : form.reporting_manager_id ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-col justify-center">
                  <p className="font-semibold text-slate-800">Assigned Manager:</p>
                  <p className="mt-1">Name: {form.reporting_manager_name}</p>
                  <p>Designation: {form.reporting_manager_designation || 'Manager'}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium transition-colors">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, error, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-600">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function inp(error) {
  return `w-full border ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    placeholder:text-gray-400 text-gray-900 bg-white`
}

