import { describe, expect, it, vi } from 'vitest'
import type { Telemetry } from '#shared/telemetry/telemetry'
import { logApsFailure, parseApsError } from '../../utils/aps'
import { apsUserIdFromToken } from '../../utils/telemetry'

describe('parseApsError', () => {
  it('reads Data Management JSON:API errors', () => {
    expect(parseApsError({ jsonapi: { version: '1.0' }, errors: [{ status: '403', code: 'BIM360DM_ERROR', title: 'Unable to get hubs', detail: 'You don\'t have permission to access this API' }] }))
      .toEqual({ aps_error_code: 'BIM360DM_ERROR', aps_error_message: 'You don\'t have permission to access this API' })
  })

  it('reads legacy developerMessage/errorCode bodies', () => {
    expect(parseApsError({ developerMessage: 'The client_id specified does not have access to the api product', errorCode: 'AUTH-001' }))
      .toEqual({ aps_error_code: 'AUTH-001', aps_error_message: 'The client_id specified does not have access to the api product' })
  })

  it('reads OAuth errors from a JSON string body', () => {
    expect(parseApsError('{"error":"invalid_grant","error_description":"The refresh token is invalid"}'))
      .toEqual({ aps_error_code: 'invalid_grant', aps_error_message: 'The refresh token is invalid' })
  })

  it('reads Model Derivative diagnostics and plain text', () => {
    expect(parseApsError({ diagnostic: 'Requested file does not exist' })).toEqual({ aps_error_code: undefined, aps_error_message: 'Requested file does not exist' })
    expect(parseApsError('Bad Gateway')).toEqual({ aps_error_message: 'Bad Gateway' })
    expect(parseApsError(undefined)).toEqual({})
  })
})

describe('apsUserIdFromToken', () => {
  const encode = (claims: object) => `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`

  it('reads the Autodesk user id from an APS JWT', () => {
    expect(apsUserIdFromToken(encode({ userid: 'ABCD1234', scope: ['data:read'] }))).toBe('ABCD1234')
  })

  it('returns undefined for missing, opaque or malformed tokens', () => {
    expect(apsUserIdFromToken(undefined)).toBeUndefined()
    expect(apsUserIdFromToken('opaque-token')).toBeUndefined()
    expect(apsUserIdFromToken('a.not-json.c')).toBeUndefined()
    expect(apsUserIdFromToken(encode({ sub: 'x' }))).toBeUndefined()
  })
})

describe('logApsFailure', () => {
  const fakeLog = () => {
    const calls = { warn: vi.fn(), error: vi.fn(), captureException: vi.fn() }
    return { calls, log: calls as unknown as Telemetry }
  }

  it('warns on 4xx without an exception', () => {
    const { calls, log } = fakeLog()
    logApsFailure(log, { aps_status: 403, aps_path: '/project/v1/hubs' })
    expect(calls.warn).toHaveBeenCalledOnce()
    expect(calls.error).not.toHaveBeenCalled()
    expect(calls.captureException).not.toHaveBeenCalled()
  })

  it('logs an error and captures one exception on 5xx and network failures', () => {
    for (const status of [503, undefined]) {
      const { calls, log } = fakeLog()
      logApsFailure(log, { aps_status: status, aps_path: '/project/v1/hubs' })
      expect(calls.error).toHaveBeenCalledOnce()
      expect(calls.captureException).toHaveBeenCalledOnce()
      expect(calls.warn).not.toHaveBeenCalled()
    }
  })
})
