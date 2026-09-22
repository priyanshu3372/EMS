import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/http'

/**
 * Company settings, served by our own API.
 *
 * Every one of these forms was previously hardcoded state: typing in them
 * changed nothing, Save showed a tick, and a reload put the old values back.
 * The geofence was worse — it lived in one administrator's localStorage, so
 * nobody else could see it and clearing the browser deleted it.
 */

const keys = {
  company: ['settings', 'company'],
  payroll: ['settings', 'payroll'],
  geofence: ['settings', 'geofence'],
  leaveTypes: ['settings', 'leave-types'],
  ptSlabs: ['settings', 'pt-slabs'],
  holidays: ['settings', 'holidays'],
}

function useSetting(key, path) {
  return useQuery({
    queryKey: key,
    queryFn: async () => (await api.get(path)).data,
  })
}

/** Invalidates one settings key after a successful write. */
function useSettingMutation(key, fn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useCompanySettings() {
  return useSetting(keys.company, '/settings/company')
}

export function useSaveCompany() {
  return useSettingMutation(keys.company, async (body) => (await api.put('/settings/company', body)).data)
}

export function usePayrollSettings() {
  return useSetting(keys.payroll, '/settings/payroll')
}

export function useSavePayroll() {
  return useSettingMutation(keys.payroll, async (body) => (await api.put('/settings/payroll', body)).data)
}

/**
 * Every set of rates the company has used, with the dates each applied.
 *
 * Worth surfacing rather than hiding: when somebody asks why February's payslip
 * deducted a different amount, this is the answer.
 */
export function usePayrollHistory() {
  return useSetting([...keys.payroll, 'history'], '/settings/payroll/history')
}

export function useGeofences() {
  return useSetting(keys.geofence, '/settings/geofence')
}

export function useSaveGeofence() {
  return useSettingMutation(keys.geofence, async (body) => (await api.put('/settings/geofence', body)).data)
}

export function useLeaveTypes() {
  return useSetting(keys.leaveTypes, '/settings/leave-types')
}

export function useCreateLeaveType() {
  return useSettingMutation(keys.leaveTypes, async (body) => (await api.post('/settings/leave-types', body)).data)
}

export function useUpdateLeaveType() {
  return useSettingMutation(keys.leaveTypes, async ({ id, ...body }) =>
    (await api.patch(`/settings/leave-types/${id}`, body)).data,
  )
}

/** Archives. The row survives so existing leave balances stay explainable. */
export function useArchiveLeaveType() {
  return useSettingMutation(keys.leaveTypes, async ({ id }) => api.del(`/settings/leave-types/${id}`))
}

export function usePtSlabs(state) {
  return useQuery({
    queryKey: [...keys.ptSlabs, state ?? 'all'],
    queryFn: async () =>
      (await api.get(state ? `/settings/pt-slabs?state=${encodeURIComponent(state)}` : '/settings/pt-slabs')).data,
  })
}

export function useHolidays(year) {
  return useQuery({
    queryKey: [...keys.holidays, year ?? 'all'],
    queryFn: async () => (await api.get(year ? `/settings/holidays?year=${year}` : '/settings/holidays')).data,
  })
}
