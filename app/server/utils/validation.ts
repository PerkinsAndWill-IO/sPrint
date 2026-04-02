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

const VALID_REGIONS = ['US', 'EMEA'] as const
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

export function sanitizeHeaderFilename(name: string): string {
  const sanitized = name.replace(/[\r\n"\\]/g, '').trim()
  return sanitized || 'download'
}
