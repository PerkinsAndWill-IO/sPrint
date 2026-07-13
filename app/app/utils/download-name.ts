export const DEFAULT_DOWNLOAD_NAME = 'sPrint Download'

/**
 * Base name for a download: single model uses the Revit model name,
 * multiple models from one project use the project name, anything else
 * falls back to a generic name.
 */
export function computeDownloadBaseName(files: { name: string, projectName?: string }[]): string {
  if (files.length === 1) {
    return files[0]!.name.replace(/\.rvt$/i, '').trim() || DEFAULT_DOWNLOAD_NAME
  }
  const projects = new Set(files.map(f => f.projectName?.trim()).filter(Boolean))
  if (projects.size === 1) return [...projects][0]!
  return DEFAULT_DOWNLOAD_NAME
}
