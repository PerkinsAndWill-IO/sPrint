/**
 * Autodesk data-centre regions, shared by the server (APS routing) and the
 * browser (deep links, pasted ACC links).
 *
 * Codes are the ones Autodesk documents for Model Derivative's `region`
 * header and for the `region` attribute of Data Management hubs:
 * https://aps.autodesk.com/en/docs/model-derivative/v2/reference/urn-manifest-derivativeurn-GET
 * https://aps.autodesk.com/en/docs/data/v2/reference/http/hubs-hub_id-GET
 * The five 2025 regions follow ISO 3166 alpha-3:
 * https://aps.autodesk.com/blog/expanding-regional-offerings-uk-germany-japan-india-and-canada-phase-ii
 */
export const APS_REGIONS = ['US', 'EMEA', 'AUS', 'CAN', 'DEU', 'IND', 'JPN', 'GBR'] as const

export type ApsRegion = typeof APS_REGIONS[number]

/**
 * Other spellings mapped to the documented code. `APAC` is the deprecated
 * Australia value (Model Derivative change history 2024-11-04, Data
 * Management 2025-04-08); the rest are ISO alpha-2 / common short forms.
 */
const REGION_ALIASES: Record<string, ApsRegion> = {
  EU: 'EMEA',
  APAC: 'AUS',
  AU: 'AUS',
  CA: 'CAN',
  DE: 'DEU',
  IN: 'IND',
  JP: 'JPN',
  GB: 'GBR',
  UK: 'GBR'
}

/**
 * Canonical region code for `value`, or undefined when it is empty or not
 * a region Autodesk documents. Case and surrounding spaces are ignored.
 */
export function normalizeApsRegion(value: unknown): ApsRegion | undefined {
  if (typeof value !== 'string') return undefined
  const upper = value.trim().toUpperCase()
  if (!upper) return undefined
  if ((APS_REGIONS as readonly string[]).includes(upper)) return upper as ApsRegion
  return REGION_ALIASES[upper]
}

/**
 * ACC web hosts per region, from Autodesk's Regional Offerings FAQ:
 * https://help.autodesk.com/cloudhelp/ENU/Docs-About-ACC/files/Regional_Data_Storage.html
 */
export const ACC_BASE_URLS: Record<ApsRegion, string> = {
  US: 'https://acc.autodesk.com',
  EMEA: 'https://acc.autodesk.eu',
  AUS: 'https://acc.aus.autodesk.com',
  CAN: 'https://acc.can.autodesk.com',
  DEU: 'https://acc.deu.autodesk.com',
  IND: 'https://acc.ind.autodesk.com',
  JPN: 'https://acc.jpn.autodesk.com',
  GBR: 'https://acc.gbr.autodesk.com'
}

/**
 * Region implied by the host of a pasted ACC or BIM 360 link, or undefined
 * when the host does not say (unknown host, or not a URL). A hint only: the
 * hub's own `region` attribute is authoritative.
 */
export function regionFromAccUrl(url: string): ApsRegion | undefined {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return undefined
  }
  if (!host.endsWith('.autodesk.com') && !host.endsWith('.autodesk.eu')) return undefined
  // acc.autodesk.eu, docs.b360.eu.autodesk.com
  if (host.endsWith('.autodesk.eu') || host.split('.').includes('eu')) return 'EMEA'
  // acc.can.autodesk.com, acc.aus.autodesk.com, ...
  const label = host.split('.').find(part => normalizeApsRegion(part) && part.length === 3)
  if (label) return normalizeApsRegion(label)
  if (host === 'acc.autodesk.com' || host === 'docs.b360.autodesk.com') return 'US'
  return undefined
}
