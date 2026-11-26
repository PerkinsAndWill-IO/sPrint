import { describe, expect, it, vi } from 'vitest'
import { createTelemetry, planTelemetry, type TelemetryAdapter } from '../telemetry'
import { REDACTED } from '../scrub'

function fakeAdapter(minLevel: TelemetryAdapter['minLevel'] = 'debug') {
  return {
    minLevel,
    log: vi.fn(),
    captureException: vi.fn(),
    track: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    flush: vi.fn(async () => {})
  } satisfies TelemetryAdapter
}

describe('planTelemetry (adapter selection)', () => {
  it('falls back to console when no PostHog key is set', () => {
    expect(planTelemetry({ key: undefined, dev: false, side: 'server' })).toEqual({ posthog: false, consoleLevel: 'info' })
    expect(planTelemetry({ key: '   ', dev: false, side: 'client' })).toEqual({ posthog: false, consoleLevel: 'info' })
  })

  it('keeps the server console on next to PostHog', () => {
    expect(planTelemetry({ key: 'phc_x', dev: false, side: 'server' })).toEqual({ posthog: true, consoleLevel: 'info' })
  })

  it('limits the production browser console to warnings', () => {
    expect(planTelemetry({ key: 'phc_x', dev: false, side: 'client' })).toEqual({ posthog: true, consoleLevel: 'warn' })
  })

  it('logs everything to the console in dev', () => {
    expect(planTelemetry({ key: undefined, dev: true, side: 'client' })).toEqual({ posthog: false, consoleLevel: 'debug' })
    expect(planTelemetry({ key: 'phc_x', dev: true, side: 'server' })).toEqual({ posthog: true, consoleLevel: 'debug' })
  })
})

describe('createTelemetry', () => {
  it('fans out to adapters and respects each adapter\'s level', () => {
    const verbose = fakeAdapter('debug')
    const quiet = fakeAdapter('warn')
    const telemetry = createTelemetry([verbose, quiet])

    telemetry.info('hello', { a: 1 })
    telemetry.error('boom')

    expect(verbose.log).toHaveBeenCalledWith('info', 'hello', { a: 1 })
    expect(verbose.log).toHaveBeenCalledWith('error', 'boom', {})
    expect(quiet.log).toHaveBeenCalledTimes(1)
    expect(quiet.log).toHaveBeenCalledWith('error', 'boom', {})
  })

  it('merges child context and scrubs everything it sends', () => {
    const adapter = fakeAdapter()
    const log = createTelemetry([adapter], { route: '/api/aps/hubs' }).child({ hub_id: 'b.1' })

    log.warn('aps.request_failed', { aps_status: 403, refresh_token: 'secret' })
    log.track('hubs_loaded', { email: 'a@b.co', hub_count: 2 })
    log.captureException(new Error('Bearer abc.def'), { status: 500 })

    expect(adapter.log).toHaveBeenCalledWith('warn', 'aps.request_failed', { route: '/api/aps/hubs', hub_id: 'b.1', aps_status: 403, refresh_token: REDACTED })
    expect(adapter.track).toHaveBeenCalledWith('hubs_loaded', { route: '/api/aps/hubs', hub_id: 'b.1', email: REDACTED, hub_count: 2 })
    const [error, context] = adapter.captureException.mock.calls[0]!
    expect(error.message).toBe(`Bearer ${REDACTED}`)
    expect(context).toEqual({ route: '/api/aps/hubs', hub_id: 'b.1', status: 500 })
  })

  it('keeps bound context when a call passes undefined for the same key', () => {
    const adapter = fakeAdapter()
    createTelemetry([adapter], { region: 'EMEA' }).child({ hub_id: undefined }).warn('aps.request_failed', { region: undefined })
    expect(adapter.log).toHaveBeenCalledWith('warn', 'aps.request_failed', { region: 'EMEA' })
  })

  it('never throws when an adapter fails', async () => {
    const broken = fakeAdapter()
    broken.log.mockImplementation(() => {
      throw new Error('network down')
    })
    broken.flush.mockRejectedValue(new Error('flush failed'))
    const healthy = fakeAdapter()
    const telemetry = createTelemetry([broken, healthy])

    expect(() => telemetry.error('still works')).not.toThrow()
    await expect(telemetry.flush()).resolves.toBeUndefined()
    expect(healthy.log).toHaveBeenCalledWith('error', 'still works', {})
  })
})
