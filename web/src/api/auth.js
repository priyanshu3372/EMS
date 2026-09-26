import { request, refreshSession, setAccessToken, clearAccessToken } from './http'

/**
 * Authentication calls. Everything here returns the session user, or throws.
 *
 * The access token never leaves this module and http.js — no component holds
 * it, no store persists it. Components deal in "who is signed in", which is
 * what the auth store keeps.
 */

export async function login(identifier, password) {
  const payload = await request('POST', '/auth/login', { identifier, password })
  setAccessToken(payload.data.accessToken)
  return payload.data.user
}

/**
 * Recovers a session after a page reload.
 *
 * The access token lived in memory and is gone; the refresh cookie survived.
 * One call trades it for a fresh pair AND returns the user, so a reload costs
 * a single request rather than a refresh followed by a session read.
 *
 * Throws when there is no usable cookie — which is the normal, expected way to
 * discover that nobody is signed in.
 */
export async function restoreSession() {
  const data = await refreshSession()
  return data.user
}

/** Re-reads the current user. Used after anything that may change a role. */
export async function fetchSession() {
  const payload = await request('GET', '/auth/session')
  return payload.data.user
}

/**
 * Ends the session. Clears local state even if the request fails — a user who
 * clicks sign out must end up signed out, and a network error is not a reason
 * to leave them looking at a logged-in screen.
 */
export async function logout() {
  try {
    await request('POST', '/auth/logout', {})
  } finally {
    clearAccessToken()
  }
}

export async function changePassword(currentPassword, newPassword) {
  const payload = await request('POST', '/auth/change-password', {
    currentPassword,
    newPassword,
  })
  setAccessToken(payload.data.accessToken)
  return payload.data.user
}

/**
 * What an invitation or reset link is for — whose account, and whether it is
 * still alive — asked before the person types a password into it.
 */
export async function inspectPasswordLink(token) {
  const payload = await request('POST', '/auth/password-link/inspect', { token })
  return payload.data
}

/**
 * Sets the password and spends the link. Does not sign in: the sign-in page
 * that follows is where the person first finds out whether they typed the
 * password they meant to.
 */
export async function redeemPasswordLink(token, password) {
  const payload = await request('POST', '/auth/password-link/redeem', { token, password })
  return payload.data
}
