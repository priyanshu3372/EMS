import type { RequestHandler } from 'express'
import { Forbidden } from '../../platform/errors/AppError'

/**
 * Protects the two routes that authenticate with a cookie instead of a header.
 *
 * Every other endpoint is safe from CSRF for free: they need an Authorization
 * header, and a browser will not attach one on a malicious site's behalf.
 * /refresh and /logout are different — the browser sends the refresh cookie
 * automatically, which is the point of a cookie and also the danger. Without a
 * guard, a page the user happens to visit could POST to /api/auth/refresh and
 * the browser would obligingly include the session.
 *
 * Two checks, both of which an attacker's page cannot pass:
 *
 *   Custom header   A cross-origin fetch carrying X-Requested-With triggers a
 *                   CORS preflight, and our CORS config only answers for our
 *                   own origin — so the real request is never sent.
 *   Content type    A plain HTML <form> is the one way to POST cross-site
 *                   without CORS at all, and a form can only send
 *                   x-www-form-urlencoded, multipart or text/plain. It cannot
 *                   produce application/json.
 *
 * Together they mean the request must have come from our own JavaScript.
 */
const REQUIRED_HEADER = 'x-requested-with'
const REQUIRED_VALUE = 'ems'

export const csrfGuard: RequestHandler = (req, _res, next) => {
  if (req.get(REQUIRED_HEADER) !== REQUIRED_VALUE) {
    throw Forbidden('This request is missing the X-Requested-With header')
  }

  // Express only PARSES application/json, so a form post would arrive with an
  // empty body rather than being rejected. Checking explicitly turns that into
  // a clear 403 instead of a confusing validation error.
  if (!req.is('application/json')) {
    throw Forbidden('This request must be sent as application/json')
  }

  next()
}
