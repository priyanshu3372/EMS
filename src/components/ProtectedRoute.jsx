import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function ProtectedRoute({ allowedRoles }) {
  const { role } = useAuthStore()
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}
