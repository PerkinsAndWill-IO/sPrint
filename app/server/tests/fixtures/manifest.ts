import type { ApsManifest, ApsManifestChild, ApsManifestDerivative } from '~/types/derivatives'

export const mockPdfChild1: ApsManifestChild = {
  guid: 'guid-a001',
  name: 'A001 - Floor Plan',
  role: '2d',
  urn: 'urn:adsk.viewing:fs.file:output/views/A001.pdf',
  ViewSets: 'Sheet Set 1',
  children: [
    {
      guid: 'guid-a001-pdf',
      name: 'A001.pdf',
      role: 'pdf-page',
      urn: 'urn:adsk.viewing:fs.file:output/pdf/A001.pdf',
      children: []
    }
  ]
}

export const mockPdfChild2: ApsManifestChild = {
  guid: 'guid-a002',
  name: 'A002 - Elevations',
  role: '2d',
  urn: 'urn:adsk.viewing:fs.file:output/views/A002.pdf',
  ViewSets: ['Sheet Set 1', 'Sheet Set 2'],
  children: [
    {
      guid: 'guid-a002-pdf',
      name: 'A002.pdf',
      role: 'pdf-page',
      urn: 'urn:adsk.viewing:fs.file:output/pdf/A002.pdf',
      children: []
    }
  ]
}

export const mock3dChild: ApsManifestChild = {
  guid: 'guid-3d',
  name: '3D View',
  role: '3d',
  urn: 'urn:adsk.viewing:fs.file:output/3d/model.svf',
  children: [
    {
      guid: 'guid-3d-geometry',
      name: 'model.svf',
      role: 'graphics',
      urn: 'urn:adsk.viewing:fs.file:output/3d/model.svf'
    }
  ]
}

export const mockThumbnailChild: ApsManifestChild = {
  guid: 'guid-thumb',
  name: 'Thumbnail',
  role: 'thumbnail',
  urn: 'urn:adsk.viewing:fs.file:output/thumb.png'
}

export const mockPdfChildNoUrn: ApsManifestChild = {
  guid: 'guid-nourn',
  name: 'S001 - Structural',
  role: '2d',
  ViewSets: 'Structural Set',
  children: [
    {
      guid: 'guid-nourn-pdf',
      name: 'S001 - Structural.pdf',
      role: 'pdf-page'
    }
  ]
}

export const mockDerivativeWithPdfs: ApsManifestDerivative = {
  name: 'TestModel.rvt',
  children: [mockPdfChild1, mockPdfChild2, mock3dChild, mockThumbnailChild],
  properties: {
    'Document Information': {
      RVTVersion: '2024'
    }
  }
}

export const mockDerivativeNoPdfs: ApsManifestDerivative = {
  name: 'TestModel.rvt',
  children: [mock3dChild, mockThumbnailChild],
  properties: {
    'Document Information': {
      RVTVersion: '2024'
    }
  }
}

export const mockDerivativeOldRevit: ApsManifestDerivative = {
  name: 'OldModel.rvt',
  children: [mockPdfChild1],
  properties: {
    'Document Information': {
      RVTVersion: '2020'
    }
  }
}

export const mockDerivativeNoVersion: ApsManifestDerivative = {
  name: 'NoVersionModel.rvt',
  children: [mockPdfChild1],
  properties: {}
}

export const mockManifestWithPdfs: ApsManifest = {
  urn: 'dXJuOmFkc2sud2lwcHJvZDpmcy5maWxlOnZmLmFiYzEyMw',
  derivatives: [mockDerivativeWithPdfs]
}

export const mockManifestNoPdfs: ApsManifest = {
  urn: 'dXJuOmFkc2sud2lwcHJvZDpmcy5maWxlOnZmLmRlZjQ1Ng',
  derivatives: [mockDerivativeNoPdfs]
}

export const mockManifestOldRevit: ApsManifest = {
  urn: 'dXJuOmFkc2sud2lwcHJvZDpmcy5maWxlOnZmLmdoaTc4OQ',
  derivatives: [mockDerivativeOldRevit]
}
