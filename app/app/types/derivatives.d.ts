export interface ApsManifestChild {
  guid: string
  name: string
  role: string
  urn?: string
  ViewSets?: string | string[]
  properties?: Record<string, string>
  children?: ApsManifestChild[]
}

export interface ApsDocumentInformation {
  RVTVersion?: string
  [key: string]: string | undefined
}

export interface ApsManifestDerivative {
  name: string
  children: ApsManifestChild[]
  properties?: {
    'Document Information'?: ApsDocumentInformation
    [key: string]: unknown
  }
}

export interface ApsManifest {
  urn: string
  derivatives: ApsManifestDerivative[]
}

export type DerivativeFormat = 'pdf' | 'dwg' | 'dwf' | 'ifc' | 'thumbnail' | 'aec' | 'sdb' | 'svf' | 'other'

export interface Derivative {
  guid: string
  name: string
  urn: string
  format: DerivativeFormat
  mimeType: string
  viewSets: string[]
  active: boolean
}

export interface ViewSet {
  name: string
  active: boolean
}

/** @deprecated Use Derivative instead */
export type PdfDerivative = Derivative
/** @deprecated Use ViewSet instead */
export type PdfViewSet = ViewSet

export interface SelectedFileState {
  itemId: string
  projectId: string
  name: string
  urn: string
  region?: string
  loading: boolean
  error: string | null
  derivatives: Derivative[]
  viewSets: ViewSet[]
  revitVersion: number | null
  revitVersionSupported: boolean
}

export interface ExportRequest {
  urn: string
  derivatives: string[]
}

export interface MultiFileExportRequest {
  files: { urn: string, derivatives: string[], name?: string }[]
}

export interface ExportOptions {
  mergeScope: 'none' | 'per-model' | 'all'
  zip: boolean
  modelFolders: boolean
}

export interface ExportResult {
  url: string
}
