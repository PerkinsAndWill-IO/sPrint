import { encodeUrn } from './urn'

interface ApsTipData {
  id: string
  attributes: { displayName?: string; name?: string; versionNumber?: number }
}

export function normalizeItemUrn(data: ApsTipData) {
  const versionUrn = data.id
  return {
    urn: encodeUrn(versionUrn),
    versionUrn,
    name: data.attributes.displayName || data.attributes.name || 'Unknown'
  }
}
