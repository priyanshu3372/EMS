import type { Response } from 'express'
import { env } from '../config/env'
import { millisUntilExpiry } from '../platform/auth/jwt'

/**
 * The refresh cookie. Every flag on it is load-bearing:
 *
 *   httpOnly   JavaScript cannot read it, so an XSS payload cannot steal the
 *              long-lived credential. This is the whole reason the refresh
 *              token is not simply kept in localStorage with the access token.
 *   secure     HTTPS only. Off in development because localhost is plain http,
 *              and a Secure cookie there is silently dropped.
 *   sameSite   'lax' is enough because the deploy target serves the React build
 *              and the API from ONE origin (Nginx on the VPS). A split host
 *              would need 'none', which needs Secure, which needs real TLS —
 *              see guide §A7 on why we are not doing that.
 *   path       Sent to /api/auth and nowhere else. Every other endpoint in the
 *              system never sees this token at all, so it cannot leak through
 *              an unrelated log line or proxy.
 */
const REFRESH_COOKIE = 'ems_refresh'
const REFRESH_PATH = '/api/auth'

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: REFRESH_PATH,
    maxAge: millisUntilExpiry(token),
  })
}

/**
 * Used by logout on Day 5. The options must match those the cookie was set
 * with — a browser will not clear a cookie whose path differs.
 */
export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: REFRESH_PATH,
  })
}

export { REFRESH_COOKIE }
