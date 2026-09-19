import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { sendNotification } from './useNotifications'

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
      const ctc = Number(form.ctc) || 0
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
        p_ctc: ctc,
        p_basic: form.basic !== undefined && form.basic !== '' ? Number(form.basic) : undefined,
        p_hra: form.hra !== undefined && form.hra !== '' ? Number(form.hra) : undefined,
        p_da: form.da !== undefined && form.da !== '' ? Number(form.da) : undefined,
        p_special_allowance: form.special_allowance !== undefined && form.special_allowance !== '' ? Number(form.special_allowance) : undefined,
        p_pf: form.pf !== undefined && form.pf !== '' ? Number(form.pf) : undefined,
        p_esi: form.esi !== undefined && form.esi !== '' ? Number(form.esi) : undefined,
        p_pt: form.pt !== undefined && form.pt !== '' ? Number(form.pt) : undefined,
        p_reporting_manager_id: form.reporting_manager_id || null,
        p_reporting_manager_name: form.reporting_manager_name || null,
        p_reporting_manager_designation: form.reporting_manager_designation || null,
      })
      if (error) throw error

      if (data && (form.bank_name || form.bank_account)) {
        await supabase.from('profiles').update({
          bank_name: form.bank_name,
          bank_account: form.bank_account,
          bank_account_holder_name: form.bank_account_holder_name || form.full_name,
          ifsc: form.ifsc,
          bank_branch: form.bank_branch || 'Main Branch',
          bank_account_type: form.bank_account_type || 'Savings',
          bank_verification_status: 'verified',
        }).eq('id', data)
      }

      if (data && (ctc > 0 || form.basic !== undefined)) {
        const gross = Math.round(ctc / 12)
        const basic = form.basic !== undefined && form.basic !== '' ? Number(form.basic) : Math.round(gross * 0.40)
        const hra = form.hra !== undefined && form.hra !== '' ? Number(form.hra) : Math.round(basic * 0.50)
        const da = form.da !== undefined && form.da !== '' ? Number(form.da) : Math.round(basic * 0.10)
        const special_allowance = form.special_allowance !== undefined && form.special_allowance !== '' ? Number(form.special_allowance) : (gross - basic - hra - da)
        const pf = form.pf !== undefined && form.pf !== '' ? Number(form.pf) : Math.round(basic * 0.12)
        const esi = form.esi !== undefined && form.esi !== '' ? Number(form.esi) : (gross <= 21000 ? Math.round(gross * 0.0075) : 0)
        const pt = form.pt !== undefined && form.pt !== '' ? Number(form.pt) : (gross > 10000 ? 200 : 0)
        const net = gross - pf - esi - pt

        await supabase.from('salary_structures').upsert({
          employee_id: data,
          ctc,
          gross,
          basic,
          hra,
          da,
          special_allowance,
          pf,
          esi,
          pt,
          net_salary: net
        }, { onConflict: 'employee_id' })
      }

      if (data) {
        await sendNotification({
          userId: data,
          title: 'Welcome to EMS',
          message: `Welcome ${form.full_name}! Your employee account setup is complete.`,
          type: 'system',
          link: '/dashboard'
        })
      }

      await sendNotification({
        userIds: ['demo-hr-admin-id', 'demo-super-admin-id'],
        title: 'New Employee Registered',
        message: `Profile created for ${form.full_name} (${form.employee_id || 'EMP'}).`,
        type: 'employee',
        link: '/employees'
      })

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['salary_structures'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ctc, basic, hra, da, special_allowance, pf, esi, pt, ...updates }) => {
      const profileUpdates = { ...updates }
      if (ctc !== undefined) profileUpdates.ctc = Number(ctc) || 0

      const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', id)
      if (error) throw error

      if (id && (ctc !== undefined || basic !== undefined)) {
        const numericCtc = Number(ctc) || 0
        const gross = Math.round(numericCtc / 12)
        const numBasic = basic !== undefined && basic !== '' ? Number(basic) : Math.round(gross * 0.40)
        const numHra = hra !== undefined && hra !== '' ? Number(hra) : Math.round(numBasic * 0.50)
        const numDa = da !== undefined && da !== '' ? Number(da) : Math.round(numBasic * 0.10)
        const numSpecial = special_allowance !== undefined && special_allowance !== '' ? Number(special_allowance) : (gross - numBasic - numHra - numDa)
        const numPf = pf !== undefined && pf !== '' ? Number(pf) : Math.round(numBasic * 0.12)
        const numEsi = esi !== undefined && esi !== '' ? Number(esi) : (gross <= 21000 ? Math.round(gross * 0.0075) : 0)
        const numPt = pt !== undefined && pt !== '' ? Number(pt) : (gross > 10000 ? 200 : 0)
        const net = gross - numPf - numEsi - numPt

        await supabase.from('salary_structures').upsert({
          employee_id: id,
          ctc: numericCtc,
          gross,
          basic: numBasic,
          hra: numHra,
          da: numDa,
          special_allowance: numSpecial,
          pf: numPf,
          esi: numEsi,
          pt: numPt,
          net_salary: net
        }, { onConflict: 'employee_id' })
      }

      if (id) {
        await sendNotification({
          userId: id,
          title: 'Profile Updated',
          message: 'Your employee profile information was updated.',
          type: 'profile',
          link: '/dashboard'
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['salary_structures'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useUpdateBankDetails() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      employeeId,
      bank_name,
      bank_account,
      bank_account_holder_name,
      ifsc,
      bank_branch,
      bank_account_type,
      bank_proof_name,
      bank_proof_url,
      employeeName,
      isHrUpdate = false
    }) => {
      const updates = {
        bank_name,
        bank_account,
        bank_account_holder_name,
        ifsc,
        bank_branch: bank_branch || 'Main Branch',
        bank_account_type: bank_account_type || 'Savings',
        bank_proof_name: bank_proof_name || 'cancelled_cheque.pdf',
        ...(bank_proof_url ? { bank_proof_url } : {}),
        bank_verification_status: isHrUpdate ? 'verified' : 'pending',
        bank_verification_remarks: isHrUpdate
          ? 'Updated and verified by HR/Finance.'
          : 'Bank details submitted by employee for salary credit. Pending verification.',
        ...(isHrUpdate ? { bank_verified_at: new Date().toISOString() } : { bank_verified_by: null, bank_verified_at: null })
      }

      const { error } = await supabase.from('profiles').update(updates).eq('id', employeeId)
      if (error) throw error

      if (!isHrUpdate) {
        // Notify HR and Finance admins
        await sendNotification({
          userIds: ['demo-hr-admin-id', 'demo-payroll-admin-id', 'demo-super-admin-id'],
          title: 'Bank Account Verification Required',
          message: `${employeeName || 'An employee'} submitted updated bank account details for salary credit.`,
          type: 'payroll',
          link: '/payroll'
        })
      } else {
        await sendNotification({
          userId: employeeId,
          title: 'Bank Account Updated',
          message: 'Your bank account details for salary credit have been updated and verified by HR/Finance.',
          type: 'payroll',
          link: '/dashboard'
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useVerifyBankAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ employeeId, status, remarks, verifiedBy, employeeName }) => {
      const isApproved = status === 'verified'
      const updates = {
        bank_verification_status: status,
        bank_verification_remarks: remarks || (isApproved ? 'Verified for salary credit by HR/Finance.' : 'Rejected. Please review and update account details.'),
        bank_verified_by: verifiedBy || 'HR/Finance',
        bank_verified_at: new Date().toISOString()
      }

      const { error } = await supabase.from('profiles').update(updates).eq('id', employeeId)
      if (error) throw error

      await sendNotification({
        userId: employeeId,
        title: isApproved ? 'Bank Account Verified' : 'Bank Account Submission Rejected',
        message: isApproved
          ? 'Your bank account details for salary credit have been successfully verified by HR/Finance.'
          : `Your bank account details submission was rejected for ${employeeName || 'account'}: ${remarks || 'Incorrect information'}. Please re-submit valid account details.`,
        type: 'payroll',
        link: '/dashboard'
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

