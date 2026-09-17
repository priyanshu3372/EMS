import { useAuthStore } from '../stores/authStore'
import HRDashboard from '../features/dashboard/HRDashboard'
import EmployeeDashboard from '../features/dashboard/EmployeeDashboard'

export default function Dashboard() {
  const { role } = useAuthStore()

  if (role === 'employee') return <EmployeeDashboard />
  return <HRDashboard />
}
