import type { H3Event } from 'h3'

const APS_BASE_URL = 'https://developer.api.autodesk.com'

export function getApsAccessToken(event: H3Event): string {
  const token = getCookie(event, 'aps_access_token')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }
  return token
}

export async function apsFetch<T>(token: string, path: string): Promise<T> {
  const url = path.startsWith('http') ? path : `${APS_BASE_URL}${path}`
  return await $fetch<T>(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
}
