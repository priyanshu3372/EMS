import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { sendNotification } from './useNotifications'

export function useLeaveRequests(userId, role) {
  return useQuery({
    queryKey: ['leave_requests', userId, role],
    queryFn: async () => {
      let query = supabase
        .from('leave_requests')
        .select('*, profiles(full_name, employee_id, department)')
        .order('created_at', { ascending: false })

      if (role === 'employee' && userId) {
        query = query.eq('employee_id', userId)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}

export function useLeaveBalances(userId, role) {
  const year = new Date().getFullYear()
  return useQuery({
    queryKey: ['leave_balances', year, userId, role],
    queryFn: async () => {
      let query = supabase
        .from('leave_balances')
        .select('*, profiles(full_name, employee_id, department)')
        .eq('year', year)
        .order('created_at')

      if (role === 'employee' && userId) {
        query = query.eq('employee_id', userId)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}

export function useApplyLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (form) => {
      const { error } = await supabase.from('leave_requests').insert(form)
      if (error) throw error

      if (form.employee_id) {
        await sendNotification({
          userId: form.employee_id,
          title: 'Leave Request Submitted',
          message: `Your ${form.leave_type || 'leave'} request for ${form.days || 1} day(s) has been submitted.`,
          type: 'leave',
          link: '/leave'
        })
        await sendNotification({
          userIds: ['demo-manager-id', 'demo-hr-admin-id', 'demo-super-admin-id'],
          title: 'New Leave Request',
          message: `A new ${form.leave_type || 'leave'} request was submitted and requires review.`,
          type: 'leave',
          link: '/leave'
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave_requests'] })
      qc.invalidateQueries({ queryKey: ['leave_balances'] })
      qc.invalidateQueries({ queryKey: ['my_dashboard'] })
      qc.invalidateQueries({ queryKey: ['dashboard_stats'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useUpdateLeaveStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, reviewed_by, employee_id, leave_type, days }) => {
      let targetEmpId = employee_id
      let type = leave_type
      let numDays = days

      if (!targetEmpId || !type) {
        const { data: req } = await supabase
          .from('leave_requests')
          .select('employee_id, leave_type, days')
          .eq('id', id)
          .single()

        if (req) {
          targetEmpId = targetEmpId || req.employee_id
          type = type || req.leave_type
          numDays = numDays || req.days
        }
      }

      const { error } = await supabase
        .from('leave_requests')
        .update({ status, reviewed_by, reviewed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error

      if (targetEmpId) {
        const leaveLabel = type ? `${type.charAt(0).toUpperCase() + type.slice(1)} Leave` : 'Leave'
        const isApproved = status === 'approved'

        await sendNotification({
          userId: targetEmpId,
          title: `Leave Request ${isApproved ? 'Approved' : 'Rejected'}`,
          message: `Your ${leaveLabel} request for ${numDays || 1} day(s) has been ${status}.`,
          type: 'leave',
          link: '/leave'
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave_requests'] })
      qc.invalidateQueries({ queryKey: ['leave_balances'] })
      qc.invalidateQueries({ queryKey: ['my_dashboard'] })
      qc.invalidateQueries({ queryKey: ['dashboard_stats'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useHolidays() {
  return useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('date')
      if (error) throw error
      return data
    },
  })
}
