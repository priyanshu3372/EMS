import { X, Download, Building2, User } from 'lucide-react'

function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

export default function PayslipModal({ open, onClose, employee, month }) {
  if (!open || !employee) return null

  const { full_name, name: legacyName, employee_id, department, designation, pan, bank_name, bank_account, ifsc, bank: legacyBank, salary } = employee
  const { basic, hra, da, special, gross, pf, esi, pt, net } = salary

  const name = full_name || legacyName || ''
  const bankNameVal = bank_name || legacyBank || 'Bank Transfer'
  const bank = bank_account ? `${bankNameVal} (${bank_account}${ifsc ? ` · IFSC: ${ifsc}` : ''})` : bankNameVal
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  function handlePrint() { window.print() }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8" id="payslip-print">

        {/* Action bar — hidden on print */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
          <p className="text-base font-semibold text-gray-900">Payslip</p>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
              <Download className="w-4 h-4" /> Download / Print
            </button>
            <button onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Payslip body */}
        <div className="p-8 space-y-6">

          {/* Company header */}
          <div className="flex items-start justify-between border-b border-gray-200 pb-5">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="CareerMap Solutions" className="h-24 w-auto object-contain shrink-0" />
              <div>
                <p className="font-bold text-gray-900 text-lg leading-tight">CareerMap Solutions</p>
                <p className="text-xs text-gray-500">Mumbai, Maharashtra — GSTIN: 27AABCC1234F1Z5</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-700">Payslip for</p>
              <p className="text-base font-bold text-blue-600">{month}</p>
            </div>
          </div>

          {/* Employee info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-700 text-sm font-bold">{initials}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-500">{designation}</p>
                </div>
              </div>
              <InfoLine label="Employee ID" value={employee_id} />
              <InfoLine label="Department" value={department} />
              <InfoLine label="PAN" value={pan} />
            </div>
            <div className="space-y-2 pt-12">
              <InfoLine label="Bank" value={bank} />
              <InfoLine label="Pay Period" value={month} />
              <InfoLine label="Pay Date" value="31 Mar 2026" />
              <InfoLine label="PF Account" value="MH/BOM/12345/001" />
            </div>
          </div>

          {/* Earnings & Deductions */}
          <div className="grid grid-cols-2 gap-6">

            {/* Earnings */}
            <div>
              <div className="bg-green-50 rounded-t-lg px-4 py-2.5 border border-green-200">
                <p className="text-sm font-semibold text-green-800">Earnings</p>
              </div>
              <div className="border border-t-0 border-green-200 rounded-b-lg overflow-hidden divide-y divide-gray-100">
                <SalaryRow label="Basic Salary" amount={basic} />
                <SalaryRow label="House Rent Allowance (HRA)" amount={hra} />
                <SalaryRow label="Dearness Allowance (DA)" amount={da} />
                <SalaryRow label="Special Allowance" amount={special} />
                <div className="flex justify-between items-center px-4 py-2.5 bg-green-50">
                  <p className="text-sm font-bold text-green-900">Gross Earnings</p>
                  <p className="text-sm font-bold text-green-700">{fmt(gross)}</p>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <div className="bg-red-50 rounded-t-lg px-4 py-2.5 border border-red-200">
                <p className="text-sm font-semibold text-red-800">Deductions</p>
              </div>
              <div className="border border-t-0 border-red-200 rounded-b-lg overflow-hidden divide-y divide-gray-100">
                <SalaryRow label="Provident Fund (12%)" amount={pf} />
                <SalaryRow label={`ESI (0.75%)${esi === 0 ? ' — N/A' : ''}`} amount={esi} dimmed={esi === 0} />
                <SalaryRow label="Professional Tax (PT)" amount={pt} />
                <SalaryRow label="TDS" amount={0} dimmed />
                <div className="flex justify-between items-center px-4 py-2.5 bg-red-50">
                  <p className="text-sm font-bold text-red-900">Total Deductions</p>
                  <p className="text-sm font-bold text-red-700">{fmt(pf + esi + pt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Net pay */}
          <div className="bg-blue-600 rounded-xl px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Net Take-Home Pay</p>
              <p className="text-white text-xs mt-0.5">After all deductions</p>
            </div>
            <p className="text-white text-2xl font-bold">{fmt(net)}</p>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
            <p className="text-xs text-gray-400">This is a computer-generated payslip and does not require a signature.</p>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Building2 className="w-3 h-3" />
              CareerMap Solutions Pvt. Ltd.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoLine({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-xs text-gray-400 w-24 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-700">{value}</span>
    </div>
  )
}

function SalaryRow({ label, amount, dimmed = false }) {
  return (
    <div className={`flex justify-between items-center px-4 py-2.5 ${dimmed ? 'opacity-40' : ''}`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-sm font-medium text-gray-900">
        {amount === 0 ? '—' : '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </p>
    </div>
  )
}
