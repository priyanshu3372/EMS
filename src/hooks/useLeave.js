import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useLeaveRequests() {
  return useQuery({
    queryKey: ['leave_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, profiles(full_name, employee_id, department)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useLeaveBalances() {
  const year = new Date().getFullYear()
  return useQuery({
    queryKey: ['leave_balances', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*, profiles(full_name, employee_id, department)')
        .eq('year', year)
        .order('created_at')
      if (error) throw error
      return data
    },
  })
}

export function useApplyLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (form) => {
      const { error } = await supabase.from('leave_requests').insert(form)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave_requests'] }),
  })
}

export function useUpdateLeaveStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, reviewed_by }) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status, reviewed_by, reviewed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave_requests'] }),
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
