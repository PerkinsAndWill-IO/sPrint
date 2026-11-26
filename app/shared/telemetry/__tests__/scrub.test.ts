import { describe, expect, it } from 'vitest'
import { REDACTED, isSensitiveKey, scrubError, scrubProps, scrubString } from '../scrub'

const JWT = 'eyJhbGciOiJSUzI1NiJ9.eyJ1c2VyaWQiOiJBQkMxMjMifQ.c2lnbmF0dXJlLXZhbHVl'

describe('isSensitiveKey', () => {
  it('matches token, secret and cookie keys in any casing', () => {
    for (const key of ['access_token', 'refreshToken', 'aps_refresh_token', 'Authorization', 'set-cookie', 'clientSecret', 'code', 'email', 'emailId', 'CloudFront-Signature', 'Key-Pair-Id', 'policy']) {
      expect(isSensitiveKey(key), key).toBe(true)
    }
  })

  it('keeps diagnostic keys', () => {
    for (const key of ['aps_error_code', 'errorCode', 'status', 'hub_id', 'project_id', 'region', 'aps_path', 'user_id', 'name']) {
      expect(isSensitiveKey(key), key).toBe(false)
    }
  })
})

describe('scrubString', () => {
  it('redacts bearer and basic credentials and bare JWTs', () => {
    expect(scrubString(`Authorization: Bearer ${JWT}`)).toBe(`Authorization: Bearer ${REDACTED}`)
    expect(scrubString('Basic Y2xpZW50OnNlY3JldA==')).toBe(`Basic ${REDACTED}`)
    expect(scrubString(`token was ${JWT}`)).toBe(`token was ${REDACTED}`)
  })

  it('redacts signed URL and OAuth query parameters but keeps the rest', () => {
    const url = 'https://cdn.derivative.autodesk.com/x.pdf?Policy=abc&Key-Pair-Id=K1&Signature=sig&page=2'
    expect(scrubString(url)).toBe(`https://cdn.derivative.autodesk.com/x.pdf?Policy=${REDACTED}&Key-Pair-Id=${REDACTED}&Signature=${REDACTED}&page=2`)
    expect(scrubString('/api/auth/aps/callback?code=xyz&state=abc')).toBe(`/api/auth/aps/callback?code=${REDACTED}&state=${REDACTED}`)
  })

  it('redacts CloudFront cookies and email addresses', () => {
    expect(scrubString('CloudFront-Policy=p1; CloudFront-Signature=s1')).toBe(`CloudFront-Policy=${REDACTED}; CloudFront-Signature=${REDACTED}`)
    expect(scrubString('user jane.doe@example.com failed')).toBe('user [email] failed')
  })

  it('leaves APS ids and URNs alone', () => {
    const value = '/data/v1/projects/b.1234-abcd/items/urn:adsk.wipprod:dm.lineage:XYZ dXJuOmFkc2sud2lwcHJvZDpmcy5maWxl'
    expect(scrubString(value)).toBe(value)
  })
})

describe('scrubProps', () => {
  it('redacts sensitive keys at any depth and drops undefined', () => {
    const result = scrubProps({
      route: '/api/aps/hubs',
      user_id: 'ABC123',
      missing: undefined,
      headers: { Authorization: 'Bearer x', Region: 'EMEA' },
      tokens: { access_token: 'a', refresh_token: 'r' },
      list: [{ cookie: 'c', ok: 1 }]
    })
    expect(result).toEqual({
      route: '/api/aps/hubs',
      user_id: 'ABC123',
      headers: { Authorization: REDACTED, Region: 'EMEA' },
      tokens: REDACTED,
      list: [{ cookie: REDACTED, ok: 1 }]
    })
  })

  it('survives circular references and errors', () => {
    const loop: Record<string, unknown> = { a: 1 }
    loop.self = loop
    expect(scrubProps({ loop, err: new Error(`failed with ${JWT}`) })).toEqual({
      loop: { a: 1, self: '[circular]' },
      err: { name: 'Error', message: `failed with ${REDACTED}` }
    })
  })
})

describe('scrubError', () => {
  it('keeps the error name and scrubs the message and stack', () => {
    const error = new TypeError(`bad token ${JWT}`)
    const safe = scrubError(error)
    expect(safe.name).toBe('TypeError')
    expect(safe.message).toBe(`bad token ${REDACTED}`)
    expect(safe.stack).not.toContain(JWT)
  })

  it('wraps non-Error values', () => {
    expect(scrubError('plain').message).toBe('plain')
    expect(scrubError({ access_token: 'x' }).message).toBe(`{"access_token":"${REDACTED}"}`)
  })
})
