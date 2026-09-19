import type { RequestHandler } from 'express'
import { login } from '../../modules/auth/auth.service'
import { loginSchema } from '../validators/auth.validator'
import { parseBody } from '../validators/parse'
import { setRefreshCookie } from '../cookies'

/**
 * POST /api/auth/login
 *
 * The one rule to keep in view while reading this: the refresh token goes into
 * the cookie and NOWHERE ELSE. Not into the body, not into a log, not into a
 * redirect. The moment it appears in a response body it becomes readable by
 * JavaScript, and httpOnly has bought nothing.
 *
 * No try/catch. The service throws AppError; Express 5 forwards it to
 * errorHandler, which is the only place a status code is set.
 */
export const postLogin: RequestHandler = async (req, res) => {
  const input = parseBody(loginSchema, req.body)

  const result = await login(input)

  setRefreshCookie(res, result.refreshToken)

  res.status(200).json({
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
    meta: { requestId: res.locals.requestId },
  })
}
