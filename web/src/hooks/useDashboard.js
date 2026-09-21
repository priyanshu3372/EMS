import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { sendNotification } from './useNotifications'

const DEPT_COLORS = {
  'Engineering': '#2563EB',
  'Sales': '#16A34A',
  'HR': '#D97706',
  'Finance': '#7C3AED',
  'Operations': '#DC2626',
  'Marketing': '#0891B2',
  'Legal': '#DB2777',
}

export function useDashboardStats() {
  const today = new Date().toISOString().split('T')[0]

  return useQuery({
    queryKey: ['dashboard_stats', today],
    queryFn: async () => {
      const [
        { data: employees },
        { data: todayAttendance },
        { data: pendingLeaves },
        { data: weekAttendance },
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, department, designation, date_of_joining, status').eq('status', 'active'),
        supabase.from('attendance').select('employee_id, status').eq('date', today),
        supabase.from('leave_requests').select('*, profiles(full_name, department)').eq('status', 'pending').order('applied_on', { ascending: false }),
        supabase.from('attendance').select('date, status').gte('date', getPastMonday()).lte('date', today),
      ])

      // RLS may block employees from reading org-wide data — treat as empty, not error

      const totalEmployees = employees?.length ?? 0
      const presentToday = todayAttendance?.filter(a => a.status === 'present' || a.status === 'wfh').length ?? 0
      const onLeaveToday = todayAttendance?.filter(a => a.status === 'on_leave').length ?? 0
      const weeklyOffList = todayAttendance?.filter(a => a.status === 'weekly_off') ?? []
      const weeklyOffToday = weeklyOffList.length

      const deptWeeklyOff = {}
      weeklyOffList.forEach(a => {
        const emp = employees?.find(e => e.id === a.employee_id)
        const dept = emp?.department || 'Other'
        deptWeeklyOff[dept] = (deptWeeklyOff[dept] || 0) + 1
      })

      // Dept breakdown for donut chart
      const deptCounts = {}
      employees?.forEach(emp => {
        const dept = emp.department || 'Other'
        deptCounts[dept] = (deptCounts[dept] || 0) + 1
      })
      const deptData = Object.entries(deptCounts).map(([name, value]) => ({
        name,
        value,
        color: DEPT_COLORS[name] || '#64748B',
      }))

      // Weekly attendance (group by date)
      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const weekMap = {}
      weekAttendance?.forEach(row => {
        const d = new Date(row.date)
        const label = dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1]
        if (!weekMap[row.date]) weekMap[row.date] = { day: label, present: 0, absent: 0, date: row.date }
        if (row.status === 'present' || row.status === 'wfh') weekMap[row.date].present++
        else if (row.status === 'absent') weekMap[row.date].absent++
      })
      const weekData = Object.values(weekMap).sort((a, b) => a.date.localeCompare(b.date))

      // Recent joiners (last 60 days)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 60)
      const cutoffStr = cutoff.toISOString().split('T')[0]
      const recentJoiners = employees
        ?.filter(e => e.date_of_joining >= cutoffStr)
        .sort((a, b) => b.date_of_joining.localeCompare(a.date_of_joining))
        .slice(0, 5) ?? []

      return {
        totalEmployees,
        presentToday,
        onLeaveToday,
        weeklyOffToday,
        deptWeeklyOff,
        pendingLeaveCount: pendingLeaves?.length ?? 0,
        pendingLeaves: pendingLeaves?.slice(0, 5) ?? [],
        deptData,
        weekData,
        recentJoiners,
      }
    },
  })
}

export function useApproveLeaveDashboard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }) => {
      // Who is signed in is now our own session, not a Supabase one. The
      // data queries below still go to Supabase until this module is cut
      // over on its own day.
      const { user } = useAuthStore.getState()

      const { data: req } = await supabase
        .from('leave_requests')
        .select('employee_id, leave_type, days')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('leave_requests')
        .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error

      if (req?.employee_id) {
        const leaveLabel = req.leave_type ? `${req.leave_type.charAt(0).toUpperCase() + req.leave_type.slice(1)} Leave` : 'Leave'
        const isApproved = status === 'approved'

        await sendNotification({
          userId: req.employee_id,
          title: `Leave Request ${isApproved ? 'Approved' : 'Rejected'}`,
          message: `Your ${leaveLabel} request for ${req.days || 1} day(s) has been ${status}.`,
          type: 'leave',
          link: '/leave'
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard_stats'] })
      qc.invalidateQueries({ queryKey: ['leave_requests'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMyDashboardStats() {
  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 8) + '01'

  return useQuery({
    queryKey: ['my_dashboard', today],
    queryFn: async () => {
      // Who is signed in is now our own session, not a Supabase one. The
      // data queries below still go to Supabase until this module is cut
      // over on its own day.
      const { user } = useAuthStore.getState()
      if (!user) throw new Error('Not authenticated')

      const [
        { data: profile },
        { data: myAttendance },
        { data: myLeaves },
        { data: leaveBalances },
      ] = await Promise.all([
        supabase.from('profiles').select('full_name, designation, department, date_of_joining').eq('id', user.id).single(),
        supabase.from('attendance').select('date, status').eq('employee_id', user.id).gte('date', monthStart).lte('date', today),
        supabase.from('leave_requests').select('*').eq('employee_id', user.id).order('applied_on', { ascending: false }).limit(5),
        supabase.from('leave_balances').select('*').eq('employee_id', user.id),
      ])

      const presentDays = myAttendance?.filter(a => a.status === 'present' || a.status === 'wfh').length ?? 0
      const absentDays = myAttendance?.filter(a => a.status === 'absent').length ?? 0
      const leaveDays = myAttendance?.filter(a => a.status === 'on_leave').length ?? 0
      const weeklyOffDays = myAttendance?.filter(a => a.status === 'weekly_off').length ?? 0
      const todayRecord = myAttendance?.find(a => a.date === today)

      const rawBalances = leaveBalances?.[0] || {}
      const mappedBalances = [
        { id: 'casual', leave_type: 'casual', remaining_days: rawBalances.casual ?? 12, total_days: 12 },
        { id: 'sick', leave_type: 'sick', remaining_days: rawBalances.sick ?? 12, total_days: 12 },
        { id: 'earned', leave_type: 'earned', remaining_days: rawBalances.earned ?? 18, total_days: 18 },
        { id: 'wfh', leave_type: 'wfh', remaining_days: rawBalances.wfh ?? 24, total_days: 24 },
        { id: 'comp_off', leave_type: 'comp_off', remaining_days: rawBalances.comp_off ?? 5, total_days: 5 },
      ]

      return {
        profile,
        presentDays,
        absentDays,
        leaveDays,
        weeklyOffDays,
        todayStatus: todayRecord?.status ?? null,
        recentLeaves: myLeaves ?? [],
        leaveBalances: mappedBalances,
      }
    },
  })
}

function getPastMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d.toISOString().split('T')[0]
}
