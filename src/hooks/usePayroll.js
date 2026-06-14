import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useSalaryStructures() {
  return useQuery({
    queryKey: ['salary_structures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_structures')
        .select('*, profiles(full_name, employee_id, department, designation)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function usePayrollRuns() {
  return useQuery({
    queryKey: ['payroll_runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function usePayslips(payrollRunId) {
  return useQuery({
    queryKey: ['payslips', payrollRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payslips')
        .select('*, profiles(full_name, employee_id, department, designation, pan, bank_name, bank_account)')
        .eq('payroll_run_id', payrollRunId)
        .order('created_at')
      if (error) throw error
      return data
    },
    enabled: !!payrollRunId,
  })
}

export function useUpsertSalaryStructure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record) => {
      const { error } = await supabase
        .from('salary_structures')
        .upsert(record, { onConflict: 'employee_id' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary_structures'] }),
  })
}

export function useCreatePayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (run) => {
      const { data, error } = await supabase
        .from('payroll_runs')
        .insert(run)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll_runs'] }),
  })
}

export function useUpdatePayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { error } = await supabase.from('payroll_runs').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll_runs'] }),
  })
}
