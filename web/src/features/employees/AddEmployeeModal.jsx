import { useState, useEffect, useMemo } from 'react'
import { X, IndianRupee, Calculator, SlidersHorizontal, Info } from 'lucide-react'
import { useEmployees, useCreateEmployee, useUpdateEmployee } from '../../hooks/useEmployees'
import { useSalaryStructures } from '../../hooks/usePayroll'

const DEPARTMENTS = ['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Marketing', 'Design', 'Product']
const DESIGNATIONS = ['Software Engineer', 'Senior Engineer', 'Tech Lead', 'Manager', 'Senior Manager', 'Director', 'Analyst', 'Executive', 'Intern']
const EMP_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern']
const ROLES = ['employee', 'manager', 'rm', 'hr', 'accounts', 'admin', 'super_admin']

const EMPTY = {
  full_name: '', email: '', password: '', employee_id: '', phone: '',
  department: '', designation: '', employment_type: 'Full-time',
  date_of_joining: '', status: 'active', role: 'employee',
  reporting_manager_id: '', reporting_manager_name: '', reporting_manager_designation: '',
  ctc: '', basic: '', hra: '', da: '', special_allowance: '', pf: '', esi: '', pt: '',
  bank_name: '', bank_account: '', bank_account_holder_name: '', ifsc: '', bank_branch: '', bank_account_type: 'Savings',
  isCustomSalary: false
}

function computeSalary(ctc) {
  const annual = Number(ctc) || 0
  const gross = Math.round(annual / 12)
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

function fmtCurrency(val) {
  if (val === undefined || val === null || val === '') return '₹0'
  return '₹' + Number(val).toLocaleString('en-IN')
}

export default function AddEmployeeModal({ open, onClose, initial = null, onSave }) {
  const isEdit = !!initial
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const { data: employeesList = [] } = useEmployees()
  const { data: salaryStructures = [] } = useSalaryStructures()
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()

  useEffect(() => {
    if (open) {
      const existingSS = initial ? salaryStructures.find(s => s.employee_id === initial.id || s.profiles?.id === initial.id) : null
      const formData = initial ? {
        ...EMPTY,
        ...initial,
        ctc: initial.ctc || existingSS?.ctc || '',
        basic: existingSS?.basic ?? '',
        hra: existingSS?.hra ?? '',
        da: existingSS?.da ?? '',
        special_allowance: existingSS?.special_allowance ?? '',
        pf: existingSS?.pf ?? '',
        esi: existingSS?.esi ?? '',
        pt: existingSS?.pt ?? '',
        isCustomSalary: false
      } : EMPTY

      queueMicrotask(() => {
        setForm(formData)
        setErrors({})
      })
    }
  }, [open, initial, salaryStructures])

  const computedSalary = useMemo(() => {
    return computeSalary(form.ctc)
  }, [form.ctc])

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

    const basicVal = form.isCustomSalary && form.basic !== '' ? Number(form.basic) : computedSalary.basic
    const hraVal = form.isCustomSalary && form.hra !== '' ? Number(form.hra) : computedSalary.hra
    const daVal = form.isCustomSalary && form.da !== '' ? Number(form.da) : computedSalary.da
    const specialVal = form.isCustomSalary && form.special_allowance !== '' ? Number(form.special_allowance) : computedSalary.special
    const pfVal = form.isCustomSalary && form.pf !== '' ? Number(form.pf) : computedSalary.pf
    const esiVal = form.isCustomSalary && form.esi !== '' ? Number(form.esi) : computedSalary.esi
    const ptVal = form.isCustomSalary && form.pt !== '' ? Number(form.pt) : computedSalary.pt

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
        ctc: form.ctc,
        basic: basicVal,
        hra: hraVal,
        da: daVal,
        special_allowance: specialVal,
        pf: pfVal,
        esi: esiVal,
        pt: ptVal,
        reporting_manager_id: form.reporting_manager_id || null,
        reporting_manager_name: form.reporting_manager_name || null,
        reporting_manager_designation: form.reporting_manager_designation || null,
        bank_name: form.bank_name || null,
        bank_account: form.bank_account || null,
        bank_account_holder_name: form.bank_account_holder_name || form.full_name,
        ifsc: form.ifsc || null,
        bank_branch: form.bank_branch || 'Main Branch',
        bank_account_type: form.bank_account_type || 'Savings',
      })
    } else {
      await createEmployee.mutateAsync({
        ...form,
        basic: basicVal,
        hra: hraVal,
        da: daVal,
        special_allowance: specialVal,
        pf: pfVal,
        esi: esiVal,
        pt: ptVal,
      })
    }

    onSave()
    onClose()
  }

  const saving = createEmployee.isPending || updateEmployee.isPending
  const saveError = createEmployee.error?.message || updateEmployee.error?.message

  const activeBasic = form.isCustomSalary && form.basic !== '' ? Number(form.basic) : computedSalary.basic
  const activeHra = form.isCustomSalary && form.hra !== '' ? Number(form.hra) : computedSalary.hra
  const activeDa = form.isCustomSalary && form.da !== '' ? Number(form.da) : computedSalary.da
  const activeSpecial = form.isCustomSalary && form.special_allowance !== '' ? Number(form.special_allowance) : computedSalary.special
  const activePf = form.isCustomSalary && form.pf !== '' ? Number(form.pf) : computedSalary.pf
  const activeEsi = form.isCustomSalary && form.esi !== '' ? Number(form.esi) : computedSalary.esi
  const activePt = form.isCustomSalary && form.pt !== '' ? Number(form.pt) : computedSalary.pt
  const activeNet = computedSalary.gross - activePf - activeEsi - activePt

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 overflow-hidden">

        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Employee' : 'Add New Employee'}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{isEdit ? 'Update employee profile & salary details' : 'Setup account details and compensation structure'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

          {saveError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{saveError}</div>
          )}

          {/* Personal & Account Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Basic Information
            </h3>
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

          {/* Salary Structure Section */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                  Salary Structure & Compensation
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Define annual CTC and view real-time monthly breakdown</p>
              </div>
              <button
                type="button"
                onClick={() => set('isCustomSalary', !form.isCustomSalary)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
                {form.isCustomSalary ? 'Auto Compute' : 'Custom Breakup'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Annual CTC (₹)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1200000"
                    value={form.ctc}
                    onChange={(e) => set('ctc', e.target.value)}
                    className={`${inp()} pl-7`}
                  />
                </div>
              </Field>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-center">
                <p className="text-xs text-slate-500 font-medium">Estimated Monthly Gross</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{fmtCurrency(computedSalary.gross)}</p>
                <p className="text-[11px] text-slate-400">Based on Annual CTC ÷ 12 months</p>
              </div>
            </div>

            {/* Custom Edit Inputs vs Calculated Breakdown Preview */}
            {form.isCustomSalary ? (
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-amber-600" />
                    Custom Components Override
                  </p>
                  <span className="text-[11px] text-amber-700">Enter custom monthly component amounts</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Basic (Monthly)">
                    <input type="number" min="0" placeholder={computedSalary.basic}
                      value={form.basic} onChange={(e) => set('basic', e.target.value)}
                      className={inp()} />
                  </Field>
                  <Field label="HRA (Monthly)">
                    <input type="number" min="0" placeholder={computedSalary.hra}
                      value={form.hra} onChange={(e) => set('hra', e.target.value)}
                      className={inp()} />
                  </Field>
                  <Field label="DA (Monthly)">
                    <input type="number" min="0" placeholder={computedSalary.da}
                      value={form.da} onChange={(e) => set('da', e.target.value)}
                      className={inp()} />
                  </Field>
                  <Field label="Special Allowance">
                    <input type="number" min="0" placeholder={computedSalary.special}
                      value={form.special_allowance} onChange={(e) => set('special_allowance', e.target.value)}
                      className={inp()} />
                  </Field>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200/60">
                  <Field label="PF (Deduction)">
                    <input type="number" min="0" placeholder={computedSalary.pf}
                      value={form.pf} onChange={(e) => set('pf', e.target.value)}
                      className={inp()} />
                  </Field>
                  <Field label="ESI (Deduction)">
                    <input type="number" min="0" placeholder={computedSalary.esi}
                      value={form.esi} onChange={(e) => set('esi', e.target.value)}
                      className={inp()} />
                  </Field>
                  <Field label="PT (Deduction)">
                    <input type="number" min="0" placeholder={computedSalary.pt}
                      value={form.pt} onChange={(e) => set('pt', e.target.value)}
                      className={inp()} />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    Monthly Salary Breakup Breakdown
                  </p>
                  <span className="text-xs font-bold text-emerald-600">
                    Net Take-Home: {fmtCurrency(activeNet)} / mo
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                    <p className="text-slate-400 font-medium">Basic (40%)</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{fmtCurrency(activeBasic)}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                    <p className="text-slate-400 font-medium">HRA (50% of Basic)</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{fmtCurrency(activeHra)}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                    <p className="text-slate-400 font-medium">DA (10% of Basic)</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{fmtCurrency(activeDa)}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                    <p className="text-slate-400 font-medium">Special Allowance</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{fmtCurrency(activeSpecial)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                  <div className="bg-red-50/60 p-2 rounded-lg border border-red-100">
                    <p className="text-red-500 font-medium">PF (12% of Basic)</p>
                    <p className="font-semibold text-red-700 mt-0.5">− {fmtCurrency(activePf)}</p>
                  </div>
                  <div className="bg-red-50/60 p-2 rounded-lg border border-red-100">
                    <p className="text-red-500 font-medium">ESI (0.75% Gross)</p>
                    <p className="font-semibold text-red-700 mt-0.5">{activeEsi > 0 ? `− ${fmtCurrency(activeEsi)}` : '₹0'}</p>
                  </div>
                  <div className="bg-red-50/60 p-2 rounded-lg border border-red-100">
                    <p className="text-red-500 font-medium">Professional Tax</p>
                    <p className="font-semibold text-red-700 mt-0.5">− {fmtCurrency(activePt)}</p>
                  </div>
                </div>
              </div>
            )}
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

            {/* Bank Account Information */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-blue-600">Bank Account Details (Salary Credit)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Bank Name">
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank, ICICI Bank"
                    value={form.bank_name || ''}
                    onChange={(e) => set('bank_name', e.target.value)}
                    className={inp()}
                  />
                </Field>
                <Field label="Account Holder Name">
                  <input
                    type="text"
                    placeholder="Account holder name"
                    value={form.bank_account_holder_name || form.full_name || ''}
                    onChange={(e) => set('bank_account_holder_name', e.target.value)}
                    className={inp()}
                  />
                </Field>

                <Field label="Bank Account Number">
                  <input
                    type="text"
                    placeholder="Account number"
                    value={form.bank_account || ''}
                    onChange={(e) => set('bank_account', e.target.value.replace(/\D/g, ''))}
                    className={inp()}
                  />
                </Field>

                <Field label="IFSC Code">
                  <input
                    type="text"
                    placeholder="e.g. HDFC0000123"
                    value={form.ifsc || ''}
                    onChange={(e) => set('ifsc', e.target.value.toUpperCase())}
                    className={inp()}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 sticky bottom-0 bg-white z-10">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium transition-colors shadow-sm">
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
