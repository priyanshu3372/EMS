import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (form) => {
      const { data, error } = await supabase.rpc('create_employee_account', {
        p_email: form.email,
        p_password: form.password,
        p_full_name: form.full_name,
        p_role: form.role || 'employee',
        p_employee_id: form.employee_id,
        p_department: form.department,
        p_designation: form.designation,
        p_phone: form.phone || '',
        p_employment_type: form.employment_type,
        p_date_of_joining: form.date_of_joining,
        p_status: form.status,
        p_reporting_manager_id: form.reporting_manager_id || null,
        p_reporting_manager_name: form.reporting_manager_name || null,
        p_reporting_manager_designation: form.reporting_manager_designation || null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })
}
