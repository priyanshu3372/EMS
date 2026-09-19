import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ─── Fetch all users from profiles ────────────────────────────────────────────

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, status, created_at')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Invite a new user (calls edge function) ──────────────────────────────────

export function useInviteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, full_name, role }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await supabase.functions.invoke('invite-user', {
        body: { email, full_name, role },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.data?.error) throw new Error(res.data.error)
      if (res.error) throw new Error(res.error.context?.error ?? res.error.message)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

// ─── Update user role (calls edge function) ───────────────────────────────────

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ user_id, role }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await supabase.functions.invoke('manage-user', {
        body: { action: 'update_role', user_id, role },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.error) throw new Error(res.error.message)
      if (res.data?.error) throw new Error(res.data.error)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

// ─── Toggle user status active ↔ inactive (calls edge function) ───────────────

export function useToggleUserStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ user_id, currentStatus }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      const res = await supabase.functions.invoke('manage-user', {
        body: { action: 'toggle_status', user_id, status: newStatus },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.error) throw new Error(res.error.message)
      if (res.data?.error) throw new Error(res.data.error)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

// ─── Delete user (calls edge function) ────────────────────────────────────────

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ user_id }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await supabase.functions.invoke('manage-user', {
        body: { action: 'delete_user', user_id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.error) throw new Error(res.error.message)
      if (res.data?.error) throw new Error(res.data.error)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
