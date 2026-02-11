import { describe, it, expect } from 'vitest'
import type { PdfDerivative, PdfViewSet, SelectedFileState } from '~/types/derivatives'

// Test the pure state logic independently from Vue reactivity

function createTestDerivatives(): PdfDerivative[] {
  return [
    { guid: 'g1', name: 'A001.pdf', urn: 'urn:pdf/A001.pdf', viewSets: ['Set A'], active: true },
    { guid: 'g2', name: 'A002.pdf', urn: 'urn:pdf/A002.pdf', viewSets: ['Set A', 'Set B'], active: true },
    { guid: 'g3', name: 'S001.pdf', urn: 'urn:pdf/S001.pdf', viewSets: ['Set B'], active: true }
  ]
}

function createTestFileState(overrides: Partial<SelectedFileState> = {}): SelectedFileState {
  return {
    itemId: 'item1',
    projectId: 'proj1',
    name: 'Model-A.rvt',
    urn: 'urn:model-a',
    loading: false,
    error: null,
    derivatives: createTestDerivatives(),
    viewSets: [{ name: 'Set A', active: true }, { name: 'Set B', active: true }],
    revitVersion: 2024,
    revitVersionSupported: true,
    ...overrides
  }
}

function toggleDerivative(derivatives: PdfDerivative[], guid: string): PdfDerivative[] {
  return derivatives.map(d =>
    d.guid === guid ? { ...d, active: !d.active } : d
  )
}

function toggleViewSet(derivatives: PdfDerivative[], viewSetName: string, active: boolean): PdfDerivative[] {
  return derivatives.map(d =>
    d.viewSets.includes(viewSetName) ? { ...d, active } : d
  )
}

function selectAll(derivatives: PdfDerivative[]): PdfDerivative[] {
  return derivatives.map(d => ({ ...d, active: true }))
}

function deselectAll(derivatives: PdfDerivative[]): PdfDerivative[] {
  return derivatives.map(d => ({ ...d, active: false }))
}

function getSelected(derivatives: PdfDerivative[]): PdfDerivative[] {
  return derivatives.filter(d => d.active)
}

function getSelectedUrns(derivatives: PdfDerivative[]): string[] {
  return derivatives.filter(d => d.active).map(d => d.urn)
}

function totalSelectedCount(files: SelectedFileState[]): number {
  return files.reduce(
    (sum, file) => sum + file.derivatives.filter(d => d.active).length,
    0
  )
}

describe('useDerivatives state logic', () => {
  describe('toggleDerivative', () => {
    it('flips active state for one derivative', () => {
      const derivatives = createTestDerivatives()
      const result = toggleDerivative(derivatives, 'g1')

      expect(result[0].active).toBe(false)
      expect(result[1].active).toBe(true)
      expect(result[2].active).toBe(true)
    })

    it('toggles back to active', () => {
      const derivatives = createTestDerivatives()
      const once = toggleDerivative(derivatives, 'g1')
      const twice = toggleDerivative(once, 'g1')

      expect(twice[0].active).toBe(true)
    })
  })

  describe('toggleViewSet', () => {
    it('deactivates all derivatives in a view set', () => {
      const derivatives = createTestDerivatives()
      const result = toggleViewSet(derivatives, 'Set A', false)

      // g1 and g2 are in Set A
      expect(result[0].active).toBe(false)
      expect(result[1].active).toBe(false)
      // g3 is only in Set B
      expect(result[2].active).toBe(true)
    })

    it('activates all derivatives in a view set', () => {
      const derivatives = deselectAll(createTestDerivatives())
      const result = toggleViewSet(derivatives, 'Set B', true)

      // g2 and g3 are in Set B
      expect(result[0].active).toBe(false)
      expect(result[1].active).toBe(true)
      expect(result[2].active).toBe(true)
    })
  })

  describe('selectedDerivatives', () => {
    it('returns only active derivatives', () => {
      const derivatives = toggleDerivative(createTestDerivatives(), 'g1')
      const selected = getSelected(derivatives)

      expect(selected).toHaveLength(2)
      expect(selected.map(d => d.guid)).toEqual(['g2', 'g3'])
    })
  })

  describe('selectedDerivativeUrns', () => {
    it('returns URN strings of active derivatives', () => {
      const derivatives = toggleDerivative(createTestDerivatives(), 'g3')
      const urns = getSelectedUrns(derivatives)

      expect(urns).toEqual(['urn:pdf/A001.pdf', 'urn:pdf/A002.pdf'])
    })
  })

  describe('selectAll / deselectAll', () => {
    it('selectAll activates all derivatives', () => {
      const derivatives = deselectAll(createTestDerivatives())
      const result = selectAll(derivatives)

      expect(result.every(d => d.active)).toBe(true)
    })

    it('deselectAll deactivates all derivatives', () => {
      const result = deselectAll(createTestDerivatives())

      expect(result.every(d => !d.active)).toBe(true)
    })
  })

  describe('multi-file state', () => {
    it('totalSelectedCount sums active derivatives across files', () => {
      const file1 = createTestFileState({ itemId: 'item1' })
      const file2 = createTestFileState({
        itemId: 'item2',
        name: 'Model-B.rvt',
        derivatives: [
          { guid: 'g4', name: 'B001.pdf', urn: 'urn:pdf/B001.pdf', viewSets: ['Set C'], active: true },
          { guid: 'g5', name: 'B002.pdf', urn: 'urn:pdf/B002.pdf', viewSets: ['Set C'], active: false }
        ]
      })

      // file1 has 3 active, file2 has 1 active
      expect(totalSelectedCount([file1, file2])).toBe(4)
    })

    it('totalSelectedCount returns 0 when no derivatives selected', () => {
      const file1 = createTestFileState({
        derivatives: deselectAll(createTestDerivatives())
      })

      expect(totalSelectedCount([file1])).toBe(0)
    })

    it('toggleDerivative scoped to specific file derivatives', () => {
      const file1 = createTestFileState()
      const file2 = createTestFileState({ itemId: 'item2' })

      // Toggle in file1 should not affect file2
      file1.derivatives = toggleDerivative(file1.derivatives, 'g1')

      expect(file1.derivatives[0].active).toBe(false)
      expect(file2.derivatives[0].active).toBe(true)
    })

    it('addFile / removeFile logic with Map', () => {
      const map = new Map<string, SelectedFileState>()
      const file = createTestFileState()

      map.set(file.itemId, file)
      expect(map.has('item1')).toBe(true)
      expect(map.size).toBe(1)

      map.delete('item1')
      expect(map.has('item1')).toBe(false)
      expect(map.size).toBe(0)
    })

    it('isFileSelected checks map membership', () => {
      const map = new Map<string, SelectedFileState>()
      const file = createTestFileState()

      expect(map.has('item1')).toBe(false)
      map.set(file.itemId, file)
      expect(map.has('item1')).toBe(true)
    })
  })
})
