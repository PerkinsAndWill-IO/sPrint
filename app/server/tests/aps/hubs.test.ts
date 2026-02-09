import { describe, it, expect } from 'vitest'

// Mock APS JSON:API response for hubs
const mockHubsResponse = {
  data: [
    {
      id: 'b.hub-123',
      type: 'hubs',
      attributes: {
        name: 'Test Hub',
        region: 'US'
      }
    },
    {
      id: 'b.hub-456',
      type: 'hubs',
      attributes: {
        name: 'Another Hub',
        region: 'EMEA'
      }
    }
  ]
}

function normalizeHubs(response: typeof mockHubsResponse) {
  return response.data.map(hub => ({
    id: hub.id,
    name: hub.attributes.name,
    region: hub.attributes.region
  }))
}

describe('hubs endpoint response transformation', () => {
  it('normalizes JSON:API response into flat hub objects', () => {
    const result = normalizeHubs(mockHubsResponse)

    expect(result).toEqual([
      { id: 'b.hub-123', name: 'Test Hub', region: 'US' },
      { id: 'b.hub-456', name: 'Another Hub', region: 'EMEA' }
    ])
  })

  it('maps id correctly from JSON:API data', () => {
    const result = normalizeHubs(mockHubsResponse)
    expect(result[0].id).toBe('b.hub-123')
    expect(result[1].id).toBe('b.hub-456')
  })

  it('maps name from attributes.name', () => {
    const result = normalizeHubs(mockHubsResponse)
    expect(result[0].name).toBe('Test Hub')
  })

  it('maps region from attributes.region', () => {
    const result = normalizeHubs(mockHubsResponse)
    expect(result[0].region).toBe('US')
    expect(result[1].region).toBe('EMEA')
  })

  it('handles empty data array', () => {
    const result = normalizeHubs({ data: [] })
    expect(result).toEqual([])
  })

  it('handles single hub', () => {
    const singleHub = {
      data: [{
        id: 'b.hub-single',
        type: 'hubs',
        attributes: { name: 'Solo Hub', region: 'US' }
      }]
    }
    const result = normalizeHubs(singleHub)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Solo Hub')
  })
})
