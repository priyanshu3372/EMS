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

function notYetOnTheNewBackend(action) {
  // These four actions ran as Supabase edge functions, authenticated with a
  // Supabase session. That session no longer exists — sign-in is our own now
  // — so the calls would fail with an unreadable error about a missing token.
  //
  // Failing here instead, with a sentence a person can act on. The real
  // endpoints (POST /users/invite, PUT /memberships/:id/role,
  // PATCH /users/:id/status, DELETE /users/:id) arrive on Day 8.
  throw new Error(
    `${action} is not available yet. User management moves to the new backend on Day 8.`,
  )
}

// ─── Invite a new user (calls edge function) ──────────────────────────────────

export function useInviteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      notYetOnTheNewBackend('Inviting a user')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

// ─── Update user role (calls edge function) ───────────────────────────────────

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      notYetOnTheNewBackend('Changing a role')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

// ─── Toggle user status active ↔ inactive (calls edge function) ───────────────

export function useToggleUserStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      notYetOnTheNewBackend('Changing account status')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

// ─── Delete user (calls edge function) ────────────────────────────────────────

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      notYetOnTheNewBackend('Deleting a user')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
