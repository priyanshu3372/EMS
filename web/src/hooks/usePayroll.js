import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { sendNotification } from './useNotifications'

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
      const { payslips = [], ...payrollRun } = run
      const { data, error } = await supabase
        .from('payroll_runs')
        .insert(payrollRun)
        .select()
        .single()
      if (error) throw error

      if (payslips.length > 0) {
        const rows = payslips.map((payslip) => ({
          ...payslip,
          payroll_run_id: data.id,
        }))
        const { error: payslipError } = await supabase
          .from('payslips')
          .upsert(rows, { onConflict: 'employee_id,payroll_run_id' })
        if (payslipError) throw payslipError

        const empIds = payslips.map(p => p.employee_id).filter(Boolean)
        await sendNotification({
          userIds: empIds,
          title: 'Payslip Released',
          message: `Your payslip for ${payrollRun.month}/${payrollRun.year} is now available.`,
          type: 'payroll',
          link: '/payroll'
        })
      }

      await sendNotification({
        userIds: ['demo-super-admin-id', 'demo-payroll-admin-id', 'demo-hr-admin-id'],
        title: 'Payroll Run Created',
        message: `Payroll run for ${payrollRun.month}/${payrollRun.year} has been created.`,
        type: 'payroll',
        link: '/payroll'
      })

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll_runs'] })
      qc.invalidateQueries({ queryKey: ['payslips'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useUpdatePayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { error } = await supabase.from('payroll_runs').update(updates).eq('id', id)
      if (error) throw error

      if (updates.status) {
        await sendNotification({
          userIds: ['demo-super-admin-id', 'demo-payroll-admin-id', 'demo-hr-admin-id'],
          title: `Payroll Run ${updates.status.toUpperCase()}`,
          message: `Payroll run status updated to ${updates.status}.`,
          type: 'payroll',
          link: '/payroll'
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll_runs'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
