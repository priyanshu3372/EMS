import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import SignIn from './pages/SignIn'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Attendance from './pages/Attendance'
import Leave from './pages/Leave'
import Payroll from './pages/Payroll'
import Reports from './pages/Reports'
import Documents from './pages/Documents'
import Settings from './pages/Settings'

async function fetchAndSetProfile(user, setProfile, setRole) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  setProfile(profile ?? null)
  setRole(profile?.role ?? 'employee')
}

export default function App() {
  const { setUser, setProfile, setRole, setLoading, clearAuth } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        await fetchAndSetProfile(session.user, setProfile, setRole)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        await fetchAndSetProfile(session.user, setProfile, setRole)
        setLoading(false)
      } else {
        clearAuth()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />

      <Route element={<Layout />}>
        {/* All authenticated users */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* HR + Admin + Super Admin + Manager + RM only */}
        <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'hr', 'manager', 'rm']} />}>
          <Route path="/employees" element={<Employees />} />
        </Route>

        {/* All roles — content differs inside each page */}
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/leave" element={<Leave />} />

        {/* Payroll — super_admin + accounts only */}
        <Route element={<ProtectedRoute allowedRoles={['super_admin', 'accounts']} />}>
          <Route path="/payroll" element={<Payroll />} />
        </Route>

        {/* Documents — all roles */}
        <Route path="/documents" element={<Documents />} />

        {/* Reports — super_admin only */}
        <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
          <Route path="/reports" element={<Reports />} />
        </Route>

        {/* Settings — super_admin only */}
        <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  )
}
