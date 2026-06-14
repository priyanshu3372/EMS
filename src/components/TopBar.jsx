import { useState } from 'react'
import { Bell, Menu, ChevronDown, User } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  hr_admin: 'HR Admin',
  payroll_admin: 'Payroll Admin',
  manager: 'Manager',
  employee: 'Employee',
}

export default function TopBar({ title, onMenuClick }) {
  const { user, profile, role } = useAuthStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email ?? ''
  const displayRole = ROLE_LABELS[role] ?? role ?? 'User'

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 shrink-0">

      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <h1 className="text-lg font-semibold text-gray-900 flex-1 truncate">{title}</h1>

      <div className="flex items-center gap-3">

        {/* Notification bell */}
        <button className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5" />
          {/* Unread dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-none">{displayName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{displayRole}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{displayEmail}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{displayRole}</p>
                </div>
                <div className="p-1">
                  <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    <User className="w-4 h-4 text-gray-400" />
                    My Profile
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
