import { encodeUrn } from './urn'

interface ApsTipData {
  id: string
  attributes: { displayName?: string, name?: string, versionNumber?: number, lastModifiedTime?: string, createTime?: string }
}

export function normalizeItemUrn(data: ApsTipData) {
  const versionUrn = data.id
  return {
    urn: encodeUrn(versionUrn),
    versionUrn,
    name: data.attributes.displayName || data.attributes.name || 'Unknown',
    lastModifiedTime: data.attributes.lastModifiedTime ?? data.attributes.createTime ?? null
  }
}
