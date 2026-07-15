import { describe, it, expect } from 'vitest'
import { computeDownloadBaseName, DEFAULT_DOWNLOAD_NAME } from '~/utils/download-name'

describe('computeDownloadBaseName', () => {
  it('uses the model name for a single file, stripping .rvt case-insensitively', () => {
    expect(computeDownloadBaseName([{ name: 'Tower A.rvt' }])).toBe('Tower A')
    expect(computeDownloadBaseName([{ name: 'Tower A.RVT' }])).toBe('Tower A')
    expect(computeDownloadBaseName([{ name: 'Tower A' }])).toBe('Tower A')
  })

  it('falls back to default for a single file with an empty name', () => {
    expect(computeDownloadBaseName([{ name: '.rvt' }])).toBe(DEFAULT_DOWNLOAD_NAME)
    expect(computeDownloadBaseName([{ name: '  ' }])).toBe(DEFAULT_DOWNLOAD_NAME)
  })

  it('uses the project name when multiple files share a project', () => {
    const files = [
      { name: 'Tower A.rvt', projectName: 'Downtown Campus' },
      { name: 'Tower B.rvt', projectName: 'Downtown Campus' }
    ]
    expect(computeDownloadBaseName(files)).toBe('Downtown Campus')
  })

  it('falls back to default when files span multiple projects', () => {
    const files = [
      { name: 'Tower A.rvt', projectName: 'Downtown Campus' },
      { name: 'Clinic.rvt', projectName: 'Northside Clinic' }
    ]
    expect(computeDownloadBaseName(files)).toBe(DEFAULT_DOWNLOAD_NAME)
  })

  it('falls back to default when project names are missing on multiple files', () => {
    const files = [{ name: 'A.rvt' }, { name: 'B.rvt' }]
    expect(computeDownloadBaseName(files)).toBe(DEFAULT_DOWNLOAD_NAME)
  })
})
