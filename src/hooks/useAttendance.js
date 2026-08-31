import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { sendNotification } from './useNotifications'

export function useAttendance(date) {
  return useQuery({
    queryKey: ['attendance', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, profiles(full_name, employee_id, department, designation)')
        .eq('date', date)
        .order('created_at')
      if (error) throw error
      return data
    },
    enabled: !!date,
  })
}

export function useMonthAttendance(year, month) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to   = `${year}-${String(month).padStart(2, '0')}-31`
  return useQuery({
    queryKey: ['attendance', 'month', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, profiles(full_name, employee_id, department, designation)')
        .gte('date', from)
        .lte('date', to)
        .order('date')
      if (error) throw error
      return data
    },
  })
}

export function useMarkAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record) => {
      const { error } = await supabase
        .from('attendance')
        .upsert(record, { onConflict: 'employee_id,date' })
      if (error) throw error

      if (record.employee_id) {
        const formattedStatus = record.status ? record.status.replace('_', ' ').toUpperCase() : 'Recorded'
        await sendNotification({
          userId: record.employee_id,
          title: 'Attendance Marked',
          message: `Attendance for ${record.date} recorded as ${formattedStatus}.`,
          type: 'attendance',
          link: '/attendance'
        })
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['attendance', vars.date] })
      qc.invalidateQueries({ queryKey: ['attendance', 'month'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
