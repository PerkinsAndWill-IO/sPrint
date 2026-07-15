import { z } from 'zod'

const APS_ID_PATTERN = /^[a-zA-Z0-9._:~-]+$/
const URN_PATTERN = /^[a-zA-Z0-9_\-+=]+$/
const MAX_ID_LENGTH = 1000

const apsIdSchema = z
  .string()
  .min(1, 'ID must not be empty')
  .max(MAX_ID_LENGTH, 'ID too long')
  .regex(APS_ID_PATTERN, 'Invalid APS ID format')

const urnSchema = z
  .string()
  .min(1, 'URN must not be empty')
  .max(MAX_ID_LENGTH, 'URN too long')
  .regex(URN_PATTERN, 'Invalid URN format')

const derivativeUrnSchema = z
  .string()
  .min(1, 'Derivative URN must not be empty')
  .max(2000, 'Derivative URN too long')
  .refine(val => !/[\r\n]/.test(val), 'Derivative URN must not contain newlines')

const VALID_REGIONS = ['US', 'EMEA', 'CAN'] as const
const regionSchema = z.enum(VALID_REGIONS)

export function validateApsId(value: string): string {
  return apsIdSchema.parse(value)
}

export function validateUrn(value: string): string {
  return urnSchema.parse(value)
}

export function validateDerivativeUrn(value: string): string {
  return derivativeUrnSchema.parse(value)
}

export function validateRegion(value: string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined
  return regionSchema.parse(value)
}

/**
 * Builds an RFC 6266 Content-Disposition value that is always Latin-1-safe.
 * Node rejects header values with code points above 0xFF (ERR_INVALID_CHAR),
 * so non-ASCII filenames (CJK, em-dashes, smart quotes) must never appear
 * raw in the header. Modern browsers read the real name from the RFC 5987
 * filename* parameter; the plain filename is an ASCII fallback.
 */
export function contentDisposition(filename: string, type: 'attachment' | 'inline' = 'attachment'): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '').trim() || 'download'
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, c =>
    '%' + c.charCodeAt(0).toString(16).toUpperCase())
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

const DEFAULT_DOWNLOAD_BASE_NAME = 'sPRINT Download'

/**
 * Resolves the base name for exported downloads from the client-provided
 * filename (model or project name). Strips header-unsafe and path
 * characters; falls back to a generic name.
 */
export function resolveDownloadBaseName(requested: unknown): string {
  if (typeof requested !== 'string' || !requested.trim()) return DEFAULT_DOWNLOAD_BASE_NAME
  const sanitized = requested
    .replace(/[\r\n"\\]/g, '')
    .replace(/[<>:/|?*]/g, '_')
    .trim()
  return sanitized || DEFAULT_DOWNLOAD_BASE_NAME
}
