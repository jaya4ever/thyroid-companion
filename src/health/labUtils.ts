import { isValidIsoDate, toIsoDate } from './healthUtils.js'
import type { LabResult, LabTestType } from '../types/health'

export interface LabResultInput {
  testType: LabTestType
  date: string
  value: number
  unit: string
  referenceMin?: number
  referenceMax?: number
  laboratoryName?: string
  notes?: string
}

export type ReferenceComparison = 'below' | 'within' | 'above' | 'not-provided'
export type LabTimeRange = '30d' | '90d' | '1y' | 'all'
export type LabSortOrder = 'newest' | 'oldest'

export const labTestOptions = [
  {
    value: 'TSH',
    description: 'A hormone that helps regulate how much thyroid hormone your thyroid produces.',
    units: ['mIU/L', 'uIU/mL'],
  },
  {
    value: 'Free T4',
    description: 'Measures the amount of free thyroxine hormone available in your blood.',
    units: ['ng/dL', 'pmol/L'],
  },
  {
    value: 'Free T3',
    description: 'Measures the amount of free triiodothyronine hormone available in your blood.',
    units: ['pg/mL', 'pmol/L'],
  },
  {
    value: 'TPO antibodies',
    description: 'Antibodies that may be associated with autoimmune thyroid conditions.',
    units: ['IU/mL', 'kIU/L'],
  },
] as const satisfies ReadonlyArray<{
  value: LabTestType
  description: string
  units: readonly string[]
}>

export function getLabTestOption(testType: LabTestType) {
  return labTestOptions.find((option) => option.value === testType) ?? labTestOptions[0]
}

export function sortLabResults(results: LabResult[], order: LabSortOrder = 'newest'): LabResult[] {
  const direction = order === 'newest' ? -1 : 1
  return [...results].sort((first, second) => (
    direction * first.date.localeCompare(second.date) || first.id.localeCompare(second.id)
  ))
}

export function filterLabResults(results: LabResult[], testType: LabTestType | 'all'): LabResult[] {
  return testType === 'all' ? [...results] : results.filter((result) => result.testType === testType)
}

export function filterLabResultsByRange(
  results: LabResult[],
  range: LabTimeRange,
  today = new Date(),
): LabResult[] {
  if (range === 'all') return [...results]
  if (Number.isNaN(today.getTime())) return []

  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(end)
  start.setDate(start.getDate() - (range === '30d' ? 29 : range === '90d' ? 89 : 364))
  const startDate = toIsoDate(start)
  const endDate = toIsoDate(end)
  return results.filter((result) => result.date >= startDate && result.date <= endDate)
}

export function validateLabResult(input: LabResultInput, today = new Date()): string {
  if (!input.testType.trim()) return 'Choose a test type.'
  if (!isValidIsoDate(input.date)) return 'Choose a valid measurement date.'
  if (input.date > toIsoDate(today)) return 'The measurement date cannot be in the future.'
  if (!Number.isFinite(input.value)) return 'Enter a finite numeric result.'
  if (!input.unit.trim()) return 'Choose a unit.'
  if (input.referenceMin !== undefined && !Number.isFinite(input.referenceMin)) {
    return 'Enter a finite minimum reference value.'
  }
  if (input.referenceMax !== undefined && !Number.isFinite(input.referenceMax)) {
    return 'Enter a finite maximum reference value.'
  }
  if (
    input.referenceMin !== undefined &&
    input.referenceMax !== undefined &&
    input.referenceMin > input.referenceMax
  ) return 'The minimum reference value must not exceed the maximum.'
  return ''
}

export function compareWithReferenceRange(result: LabResult): ReferenceComparison {
  const { referenceMin, referenceMax } = result
  if (referenceMin === undefined && referenceMax === undefined) return 'not-provided'
  if (referenceMin !== undefined && result.value < referenceMin) return 'below'
  if (referenceMax !== undefined && result.value > referenceMax) return 'above'
  return 'within'
}

export function formatReferenceComparison(comparison: ReferenceComparison): string {
  if (comparison === 'below') return 'Below the entered range'
  if (comparison === 'within') return 'Within the entered range'
  if (comparison === 'above') return 'Above the entered range'
  return 'Reference range not provided.'
}