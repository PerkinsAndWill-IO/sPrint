import { describe, it, expect } from 'vitest'
import { sanitizeApsError } from '../../utils/aps'

describe('sanitizeApsError', () => {
  it('returns generic message without leaking upstream details', () => {
    const result = sanitizeApsError(502, { detail: 'internal APS structure leaked' })
    expect(result).not.toContain('internal APS structure')
    expect(result).toContain('APS API error')
  })

  it('includes the status code for debugging context', () => {
    const result = sanitizeApsError(404, 'Not found')
    expect(result).toContain('404')
  })

  it('does not include raw error data or stack traces', () => {
    const result = sanitizeApsError(500, {
      stack: 'Error at line 42...',
      data: { secret: 'token123' }
    })
    expect(result).not.toContain('token123')
    expect(result).not.toContain('line 42')
    expect(result).not.toContain('stack')
  })
})
