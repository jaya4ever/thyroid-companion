import { describe, expect, it } from 'vitest'
import {
  compareWithReferenceRange,
  filterLabResults,
  filterLabResultsByRange,
  formatReferenceComparison,
  sortLabResults,
  validateLabResult,
} from './labUtils.js'
import type { LabResult } from '../types/health'

const sampleResults: LabResult[] = [
  { id: 'b', testType: 'TSH', date: '2026-10-18', value: 2.1, unit: 'mIU/L' },
  { id: 'a', testType: 'Free T4', date: '2026-09-18', value: 1.2, unit: 'ng/dL' },
  { id: 'c', testType: 'TSH', date: '2026-10-04', value: 2.4, unit: 'mIU/L' },
]

describe('lab result helpers', () => {
  it('sorts by date in either direction without changing the input', () => {
    expect(sortLabResults(sampleResults).map((result) => result.id)).toEqual(['b', 'c', 'a'])
    expect(sortLabResults(sampleResults, 'oldest').map((result) => result.id)).toEqual(['a', 'c', 'b'])
  })

  it('filters results by selected test type', () => {
    expect(filterLabResults(sampleResults, 'TSH').map((result) => result.id)).toEqual(['b', 'c'])
    expect(filterLabResults(sampleResults, 'all')).toHaveLength(3)
  })

  it('compares values only with the supplied reference boundaries', () => {
    expect(compareWithReferenceRange({ ...sampleResults[0], value: 1, referenceMin: 2, referenceMax: 4 })).toBe('below')
    expect(compareWithReferenceRange({ ...sampleResults[0], value: 3, referenceMin: 2, referenceMax: 4 })).toBe('within')
    expect(compareWithReferenceRange({ ...sampleResults[0], value: 5, referenceMin: 2, referenceMax: 4 })).toBe('above')
  })

  it('supports one-sided reference limits and missing ranges', () => {
    expect(compareWithReferenceRange({ ...sampleResults[0], value: 2, referenceMax: 5 })).toBe('within')
    expect(compareWithReferenceRange({ ...sampleResults[0], value: 6, referenceMax: 5 })).toBe('above')
    expect(compareWithReferenceRange({ ...sampleResults[0], value: 3, referenceMin: 5 })).toBe('below')
    expect(compareWithReferenceRange(sampleResults[0])).toBe('not-provided')
    expect(formatReferenceComparison(compareWithReferenceRange(sampleResults[0]))).toBe('Reference range not provided.')
  })

  it('rejects invalid dates, future dates, and non-finite measurements', () => {
    const today = new Date(2026, 9, 26)
    expect(validateLabResult({ ...sampleResults[0], date: '2026-02-30' }, today)).toContain('valid measurement date')
    expect(validateLabResult({ ...sampleResults[0], date: '2026-10-27' }, today)).toContain('future')
    expect(validateLabResult({ ...sampleResults[0], value: Number.NaN }, today)).toContain('finite numeric')
    expect(validateLabResult({ ...sampleResults[0], value: Number.POSITIVE_INFINITY }, today)).toContain('finite numeric')
  })

  it('rejects invalid reference ranges', () => {
    expect(validateLabResult({ ...sampleResults[0], referenceMin: 4, referenceMax: 2 })).toContain('must not exceed')
    expect(validateLabResult({ ...sampleResults[0], referenceMin: Number.NaN })).toContain('finite minimum')
  })

  it('filters date ranges and handles invalid comparison dates', () => {
    expect(filterLabResultsByRange(sampleResults, '30d', new Date(2026, 9, 26)).map((result) => result.id)).toEqual(['b', 'c'])
    expect(filterLabResultsByRange(sampleResults, 'all')).toHaveLength(3)
    expect(filterLabResultsByRange(sampleResults, '30d', new Date(Number.NaN))).toEqual([])
  })
})