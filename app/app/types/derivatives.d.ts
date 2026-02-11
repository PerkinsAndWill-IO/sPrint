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

export interface PdfDerivative {
  guid: string
  name: string
  urn: string
  viewSets: string[]
  active: boolean
}

export interface PdfViewSet {
  name: string
  active: boolean
}

export interface SelectedFileState {
  itemId: string
  projectId: string
  name: string
  urn: string
  loading: boolean
  error: string | null
  derivatives: PdfDerivative[]
  viewSets: PdfViewSet[]
  revitVersion: number | null
  revitVersionSupported: boolean
}

export interface ExportRequest {
  urn: string
  derivatives: string[]
}

export interface MultiFileExportRequest {
  files: { urn: string; derivatives: string[]; name?: string }[]
}

export interface ExportResult {
  url: string
}
