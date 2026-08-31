import { useState, useMemo } from 'react'
import { Search, Plus, Filter, Download, MoreVertical, ChevronUp, ChevronDown } from 'lucide-react'
import AddEmployeeModal from '../features/employees/AddEmployeeModal'
import EmployeeDrawer from '../features/employees/EmployeeDrawer'
import { useEmployees, useUpdateEmployee } from '../hooks/useEmployees'

const DEPARTMENTS = ['All', 'Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Marketing', 'Design', 'Product']
const STATUS_OPTIONS = ['All', 'active', 'inactive']

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

function initials(name) {
  return (name || '').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Employees() {
  const { data: employees = [], isLoading } = useEmployees()
  const updateEmployee = useUpdateEmployee()

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortKey, setSortKey] = useState('full_name')
  const [sortDir, setSortDir] = useState('asc')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [drawerEmp, setDrawerEmp] = useState(null)
  const [menuOpenId, setMenuOpenId] = useState(null)

  const filtered = useMemo(() => {
    let list = employees
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((e) =>
        (e.full_name || '').toLowerCase().includes(q) ||
        (e.employee_id || '').toLowerCase().includes(q)
      )
    }
    if (deptFilter !== 'All') list = list.filter((e) => e.department === deptFilter)
    if (statusFilter !== 'All') list = list.filter((e) => e.status === statusFilter)
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
    return list
  }, [employees, search, deptFilter, statusFilter, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function handleSave() {
    setEditTarget(null)
    setModalOpen(false)
  }

  function openAdd() { setEditTarget(null); setModalOpen(true) }
  function openEdit(emp) { setEditTarget(emp); setModalOpen(true); setDrawerEmp(null) }
  function openDrawer(emp) { setDrawerEmp(emp); setMenuOpenId(null) }

  function handleDeactivate(emp) {
    const newStatus = emp.status === 'active' ? 'inactive' : 'active'
    updateEmployee.mutate({ id: emp.id, status: newStatus })
    setMenuOpenId(null)
  }

  function handleExport() {
    const headers = ['Full Name', 'Employee ID', 'Department', 'Designation', 'Phone', 'Employment Type', 'Date of Joining', 'Status', 'CTC']
    const rows = filtered.map((e) => [
      e.full_name || '',
      e.employee_id || '',
      e.department || '',
      e.designation || '',
      e.phone || '',
      e.employment_type || '',
      e.date_of_joining || '',
      e.status || '',
      e.ctc || 0,
    ])
    const lines = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <>
      <div className="space-y-5">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Employees</h2>
            <p className="text-sm text-gray-500 mt-0.5">{employees.length} total employees</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" placeholder="Search by name or ID…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700
                focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700
              focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <span className="text-sm text-gray-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <Th onClick={() => toggleSort('full_name')} className="pl-5">Employee {sortKey === 'full_name' ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500 inline" /> : <ChevronDown className="w-3 h-3 text-blue-500 inline" />) : <ChevronUp className="w-3 h-3 text-gray-300 inline" />}</Th>
                  <Th onClick={() => toggleSort('employee_id')}>ID {sortKey === 'employee_id' ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500 inline" /> : <ChevronDown className="w-3 h-3 text-blue-500 inline" />) : <ChevronUp className="w-3 h-3 text-gray-300 inline" />}</Th>
                  <Th onClick={() => toggleSort('department')}>Department {sortKey === 'department' ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500 inline" /> : <ChevronDown className="w-3 h-3 text-blue-500 inline" />) : <ChevronUp className="w-3 h-3 text-gray-300 inline" />}</Th>
                  <Th onClick={() => toggleSort('date_of_joining')}>Joined {sortKey === 'date_of_joining' ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500 inline" /> : <ChevronDown className="w-3 h-3 text-blue-500 inline" />) : <ChevronUp className="w-3 h-3 text-gray-300 inline" />}</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th className="text-right pr-5">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-sm text-gray-400">Loading employees…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-sm text-gray-400">No employees found.</td>
                  </tr>
                ) : filtered.map((emp, index) => (
                  <tr key={emp.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openDrawer(emp)}>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-blue-700 text-xs font-semibold">{initials(emp.full_name)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{emp.full_name}</p>
                          <p className="text-xs text-gray-400 truncate">{emp.designation || '—'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-600 font-mono">{emp.employee_id || '—'}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="text-sm text-gray-700">{emp.department || '—'}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-600">{formatDate(emp.date_of_joining)}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${EMP_TYPE_CLASS[emp.employment_type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {emp.employment_type || 'Full-time'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_CLASS[emp.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {emp.status || 'active'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button onClick={() => setMenuOpenId(menuOpenId === emp.id ? null : emp.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpenId === emp.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                            <div className={`absolute right-0 ${index >= Math.max(1, filtered.length - 2) ? 'bottom-full mb-1' : 'top-full mt-1'} w-40 bg-white rounded-xl border border-gray-200 shadow-lg z-20 overflow-hidden py-1`}>
                              <button onClick={() => openDrawer(emp)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                View Profile
                              </button>
                              <button onClick={() => openEdit(emp)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                Edit
                              </button>
                              <button onClick={() => handleDeactivate(emp)}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors ${emp.status === 'active' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                                {emp.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">Showing {filtered.length} of {employees.length} employees</p>
            </div>
          )}
        </div>
      </div>

      <AddEmployeeModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        initial={editTarget}
        onSave={handleSave}
      />

      <EmployeeDrawer
        employee={drawerEmp}
        onClose={() => setDrawerEmp(null)}
        onEdit={() => openEdit(drawerEmp)}
      />
    </>
  )
}

function Th({ children, onClick, className = '' }) {
  return (
    <th onClick={onClick}
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider
        ${onClick ? 'cursor-pointer hover:text-gray-700 select-none' : ''} ${className}`}>
      <div className="flex items-center gap-1">{children}</div>
    </th>
  )
}
