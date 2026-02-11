import { describe, it, expect } from 'vitest'
import { normalizeWarnings } from '../../utils/aps-normalize'

describe('normalizeWarnings', () => {
  it('prefers Detail, falls back to Title, then "Unknown warning"', () => {
    expect(normalizeWarnings([
      { Detail: 'Detail warning', Title: 'Ignored' },
      { Title: 'Title warning' },
      {}
    ])).toEqual([
      'Detail warning',
      'Title warning',
      'Unknown warning'
    ])
  })

  it('handles undefined and empty', () => {
    expect(normalizeWarnings(undefined)).toEqual([])
    expect(normalizeWarnings([])).toEqual([])
  })
})
