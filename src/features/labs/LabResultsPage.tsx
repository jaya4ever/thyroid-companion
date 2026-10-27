import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@chakra-ui/react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useHealthData } from '../../context/useHealthData.js'
import {
  compareWithReferenceRange,
  filterLabResults,
  filterLabResultsByRange,
  formatReferenceComparison,
  getLabTestOption,
  labTestOptions,
  sortLabResults,
  validateLabResult,
} from '../../health/labUtils.js'
import type { LabResultInput, LabSortOrder, LabTimeRange } from '../../health/labUtils'
import { toIsoDate } from '../../health/healthUtils.js'
import type { LabResult, LabTestType } from '../../types/health'

interface LabFormState {
  testType: LabTestType
  date: string
  value: string
  unit: string
  referenceMin: string
  referenceMax: string
  laboratoryName: string
  notes: string
}

const timeRanges: { value: LabTimeRange; label: string }[] = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
  { value: 'all', label: 'All' },
]

function createEmptyForm(): LabFormState {
  return {
    testType: 'TSH',
    date: toIsoDate(new Date()),
    value: '',
    unit: labTestOptions[0].units[0],
    referenceMin: '',
    referenceMax: '',
    laboratoryName: '',
    notes: '',
  }
}

function createFormFromResult(result: LabResult): LabFormState {
  return {
    testType: result.testType,
    date: result.date,
    value: String(result.value),
    unit: result.unit,
    referenceMin: result.referenceMin === undefined ? '' : String(result.referenceMin),
    referenceMax: result.referenceMax === undefined ? '' : String(result.referenceMax),
    laboratoryName: result.laboratoryName ?? '',
    notes: result.notes ?? '',
  }
}

function toLabResultInput(draft: LabFormState): LabResultInput {
  const input: LabResultInput = {
    testType: draft.testType,
    date: draft.date,
    value: draft.value.trim() === '' ? Number.NaN : Number(draft.value),
    unit: draft.unit,
  }
  if (draft.referenceMin.trim() !== '') input.referenceMin = Number(draft.referenceMin)
  if (draft.referenceMax.trim() !== '') input.referenceMax = Number(draft.referenceMax)
  if (draft.laboratoryName.trim()) input.laboratoryName = draft.laboratoryName.trim()
  if (draft.notes.trim()) input.notes = draft.notes.trim()
  return input
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatReference(result: LabResult): string {
  const { referenceMin, referenceMax } = result
  if (referenceMin === undefined && referenceMax === undefined) return 'Not provided'
  if (referenceMin !== undefined && referenceMax !== undefined) {
    return `${referenceMin}–${referenceMax} ${result.unit}`
  }
  if (referenceMin !== undefined) return `≥ ${referenceMin} ${result.unit}`
  return `≤ ${referenceMax} ${result.unit}`
}

function LabResultForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: LabFormState
  onSave: (input: LabResultInput) => string
  onCancel?: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState('')
  const selectedTest = getLabTestOption(draft.testType)
  const testOptions = labTestOptions.some((option) => option.value === draft.testType)
    ? labTestOptions
    : [...labTestOptions, { value: draft.testType, description: '', units: [draft.unit] }]

  function updateField<Field extends keyof LabFormState>(field: Field, value: LabFormState[Field]): void {
    setDraft((current) => ({ ...current, [field]: value }))
    setError('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const input = toLabResultInput(draft)
    const validationMessage = validateLabResult(input)
    if (validationMessage) {
      setError(validationMessage)
      return
    }
    const saveError = onSave(input)
    if (saveError) {
      setError(saveError)
      return
    }
    setError('')
    if (!onCancel) setDraft(createEmptyForm())
  }

  return (
    <form className="lab-form" onSubmit={handleSubmit} noValidate>
      <div className="lab-form-grid">
        <div className="form-field">
          <label className="field-label" data-required="true" htmlFor="lab-test-type">Test type</label>
          <select
            className="field-input field-select"
            id="lab-test-type"
            value={draft.testType}
            required
            aria-invalid={Boolean(error && error.includes("test type"))}
            aria-describedby={error && error.includes("test type") ? "lab-form-error" : undefined}
            onChange={(event) => {
              const nextTest = event.target.value
              const nextOption = getLabTestOption(nextTest)
              setDraft((current) => ({
                ...current,
                testType: nextTest,
                unit: nextOption.units[0],
              }))
              setError('')
            }}
          >
            {testOptions.map((option) => <option key={option.value} value={option.value}>{option.value}</option>)}
          </select>
          <span className="field-hint">{selectedTest.description}</span>
        </div>
        <div className="form-field">
          <label className="field-label" data-required="true" htmlFor="lab-date">Measurement date</label>
          <input
            className="field-input"
            id="lab-date"
            type="date"
            max={toIsoDate(new Date())}
            value={draft.date}
            onChange={(event) => updateField('date', event.target.value)}
            required
            aria-invalid={Boolean(error && error.includes('date'))}
            aria-describedby={error && error.includes('date') ? "lab-form-error" : undefined}
          />
        </div>
        <div className="form-field">
          <label className="field-label" data-required="true" htmlFor="lab-value">Measurement</label>
          <input
            className="field-input"
            id="lab-value"
            type="number"
            step="any"
            inputMode="decimal"
            value={draft.value}
            onChange={(event) => updateField('value', event.target.value)}
            required
            aria-invalid={Boolean(error && (error.includes('numeric') || error.includes('measurement')))}
            aria-describedby={error && (error.includes('numeric') || error.includes('measurement')) ? "lab-form-error" : undefined}
          />
        </div>
        <div className="form-field">
          <label className="field-label" data-required="true" htmlFor="lab-unit">Unit</label>
          <select
            className="field-input field-select"
            id="lab-unit"
            value={draft.unit}
            required
            aria-invalid={Boolean(error && error.includes('unit'))}
            aria-describedby={error && error.includes('unit') ? "lab-form-error" : undefined}
            onChange={(event) => updateField('unit', event.target.value)}
          >
            {selectedTest.units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="lab-reference-min">Reference minimum (optional)</label>
          <input
            className="field-input"
            id="lab-reference-min"
            type="number"
            step="any"
            inputMode="decimal"
            value={draft.referenceMin}
            onChange={(event) => updateField('referenceMin', event.target.value)}
            aria-invalid={Boolean(error && (error.includes('minimum reference') || error.includes('must not exceed')))}
            aria-describedby={error && (error.includes('minimum reference') || error.includes('must not exceed')) ? "lab-form-error" : undefined}
          />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="lab-reference-max">Reference maximum (optional)</label>
          <input
            className="field-input"
            id="lab-reference-max"
            type="number"
            step="any"
            inputMode="decimal"
            value={draft.referenceMax}
            onChange={(event) => updateField('referenceMax', event.target.value)}
            aria-invalid={Boolean(error && (error.includes('maximum reference') || error.includes('must not exceed')))}
            aria-describedby={error && (error.includes('maximum reference') || error.includes('must not exceed')) ? "lab-form-error" : undefined}
          />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="lab-laboratory">Laboratory name (optional)</label>
          <input
            className="field-input"
            id="lab-laboratory"
            value={draft.laboratoryName}
            onChange={(event) => updateField('laboratoryName', event.target.value)}
          />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="lab-notes">Notes (optional)</label>
          <textarea
            className="field-input lab-notes-input"
            id="lab-notes"
            value={draft.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            rows={3}
          />
        </div>
      </div>
      {error && <p className="field-error" id="lab-form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <Button className="primary-action" type="submit">Save result</Button>
        {onCancel && <Button className="secondary-action" type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  )
}

function LabTrendChart({ results }: { results: LabResult[] }) {
  const [testType, setTestType] = useState<LabTestType>('TSH')
  const [unit, setUnit] = useState('')
  const [range, setRange] = useState<LabTimeRange>('all')
  const testResults = filterLabResults(results, testType)
  const availableUnits = [...new Set(testResults.map((result) => result.unit))].sort()
  const selectedUnit = availableUnits.includes(unit) ? unit : availableUnits[0] ?? ''
  const chartResults = sortLabResults(
    filterLabResultsByRange(testResults.filter((result) => result.unit === selectedUnit), range),
    'oldest',
  )
  const chartData = chartResults.map((result) => ({
    date: new Date(`${result.date}T00:00:00`).getTime(),
    value: result.value,
    testType: result.testType,
  }))

  useEffect(() => {
    if (selectedUnit !== unit) setUnit(selectedUnit)
  }, [selectedUnit, unit])

  return (
    <section className="panel lab-chart-panel" aria-labelledby="lab-chart-title">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title" id="lab-chart-title">Lab trends</h2>
          <p className="panel-caption">Each chart uses one test and one recorded unit.</p>
        </div>
      </div>
      <div className="lab-chart-controls">
        <div className="form-field">
          <label className="field-label" htmlFor="chart-test-type">Test type</label>
          <select className="field-input field-select" id="chart-test-type" value={testType} onChange={(event) => setTestType(event.target.value)}>
            {labTestOptions.map((option) => <option key={option.value} value={option.value}>{option.value}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="chart-unit">Unit</label>
          <select className="field-input field-select" id="chart-unit" value={selectedUnit} onChange={(event) => setUnit(event.target.value)} disabled={availableUnits.length === 0}>
            {availableUnits.map((availableUnit) => <option key={availableUnit} value={availableUnit}>{availableUnit}</option>)}
          </select>
        </div>
        <div className="form-field lab-range-field">
          <span className="field-label" id="lab-chart-range-label">Time range</span>
          <div className="range-buttons" role="group" aria-labelledby="lab-chart-range-label">
            {timeRanges.map((item) => (
              <button
                className="range-button"
                key={item.value}
                type="button"
                aria-pressed={range === item.value}
                onClick={() => setRange(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {chartResults.length >= 2 ? (
        <>
          <div className="chart-wrap lab-chart-wrap" role="img" aria-label={`${testType} measurements in ${selectedUnit}, with dates on the horizontal axis and measurements on the vertical axis`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart accessibilityLayer data={chartData} margin={{ top: 8, right: 20, bottom: 0, left: 8 }}>
                <CartesianGrid vertical={false} stroke="#edf1eb" strokeDasharray="3 5" />
                <XAxis
                  dataKey="date"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(date: number) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5f7066', fontSize: 10 }}
                  tickMargin={10}
                />
                <YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#5f7066', fontSize: 10 }} label={{ value: selectedUnit, angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  labelFormatter={(date) => new Date(Number(date)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  formatter={(value) => [`${value} ${selectedUnit}`, 'Result']}
                />
                <Line dataKey="value" name={testType} type="linear" stroke="#4f866f" strokeWidth={2.5} dot={{ r: 4, fill: '#4f866f' }} activeDot={{ r: 6, fill: '#28695d', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="table-scroll" role="region" aria-label={`Chart values for ${testType} in ${selectedUnit}`} tabIndex={0}>
            <table className="demo-data-table lab-chart-table">
              <caption className="visually-hidden">Chart values for {testType} in {selectedUnit}</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Result</th></tr></thead>
              <tbody>{chartResults.map((result) => <tr key={result.id}><td>{formatDate(result.date)}</td><td>{result.value} {result.unit}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="inline-empty-state" role="status">At least two results for this test, unit, and time range are needed to show a trend.</div>
      )}
    </section>
  )
}

function LabResultsPage() {
  const { labResults, addLabResult, editLabResult, deleteLabResult } = useHealthData()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<LabTestType | 'all'>('all')
  const [sortOrder, setSortOrder] = useState<LabSortOrder>('newest')
  const [status, setStatus] = useState('')
  const visibleResults = sortLabResults(filterLabResults(labResults, filterType), sortOrder)
  const editingResult = editingId ? labResults.find((result) => result.id === editingId) : undefined

  function saveNewResult(input: LabResultInput): string {
    const error = addLabResult(input)
    if (!error) setStatus('Lab result added for this demo session.')
    return error
  }

  function saveEditedResult(input: LabResultInput): string {
    if (!editingId) return 'Choose a result to edit.'
    const error = editLabResult(editingId, input)
    if (!error) {
      setEditingId(null)
      setStatus('Lab result updated for this demo session.')
    }
    return error
  }

  function confirmDelete(result: LabResult): void {
    if (!window.confirm(`Delete the ${result.testType} result from ${formatDate(result.date)}?`)) return
    deleteLabResult(result.id)
    if (editingId === result.id) setEditingId(null)
    setStatus('Lab result deleted for this demo session.')
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Your records</p>
          <h1 className="page-title">Lab results</h1>
          <p className="page-subtitle">Track fictional demo results and reference information from your own report.</p>
        </div>
      </header>

      {status && <p className="form-status lab-page-status" role="status" aria-live="polite">{status}</p>}

      <div className="lab-page-grid">
        <section className="panel lab-entry-panel" aria-labelledby="lab-entry-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="lab-entry-title">{editingResult ? 'Edit lab result' : 'Add a lab result'}</h2>
              <p className="panel-caption">Enter the values and reference range shown on your report.</p>
            </div>
          </div>
          <LabResultForm
            key={editingResult?.id ?? 'new-lab-result'}
            initial={editingResult ? createFormFromResult(editingResult) : createEmptyForm()}
            onSave={editingResult ? saveEditedResult : saveNewResult}
            onCancel={editingResult ? () => setEditingId(null) : undefined}
          />
        </section>

        <section className="panel lab-records-panel" aria-labelledby="lab-records-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="lab-records-title">Saved results</h2>
              <p className="panel-caption">{labResults.length} fictional records in this session</p>
            </div>
          </div>
          <div className="lab-list-controls">
            <div className="form-field">
              <label className="field-label" htmlFor="lab-filter">Filter by test</label>
              <select className="field-input field-select" id="lab-filter" value={filterType} onChange={(event) => setFilterType(event.target.value)}>
                <option value="all">All tests</option>
                {labTestOptions.map((option) => <option key={option.value} value={option.value}>{option.value}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="field-label" htmlFor="lab-sort">Sort by date</label>
              <select className="field-input field-select" id="lab-sort" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as LabSortOrder)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>
          {visibleResults.length > 0 ? (
            <div className="table-scroll" role="region" aria-label="Saved fictional thyroid lab results" tabIndex={0}>
              <table className="demo-data-table lab-results-table">
                <caption className="visually-hidden">Saved fictional thyroid lab results</caption>
                <thead><tr><th scope="col">Test and date</th><th scope="col">Result</th><th scope="col">Reference</th><th scope="col">Actions</th></tr></thead>
                <tbody>
                  {visibleResults.map((result) => (
                    <tr key={result.id}>
                      <td>
                        <strong>{result.testType}</strong>
                        <span className="lab-table-subtext">{formatDate(result.date)}</span>
                        {result.laboratoryName && <span className="lab-table-subtext">{result.laboratoryName}</span>}
                        {result.notes && <span className="lab-table-notes">{result.notes}</span>}
                      </td>
                      <td>{result.value} {result.unit}<span className="lab-table-subtext">{formatReferenceComparison(compareWithReferenceRange(result))}</span></td>
                      <td>{formatReference(result)}</td>
                      <td>
                        <div className="record-actions">
                          <Button className="text-button" type="button" onClick={() => { setEditingId(result.id); setStatus('') }}>Edit<span className="visually-hidden"> {result.testType} from {result.date}</span></Button>
                          <Button className="text-button text-button-danger" type="button" onClick={() => confirmDelete(result)}>Delete<span className="visually-hidden"> {result.testType} from {result.date}</span></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="inline-empty-state" role="status">No lab results match this test filter.</div>
          )}
        </section>

        <LabTrendChart results={labResults} />
      </div>
      <p className="temporary-data-note" role="note">This information is for education and tracking only. It does not replace medical advice. Discuss your results with your healthcare professional. Changes stay in temporary session memory and disappear when the page refreshes.</p>
    </>
  )
}

export default LabResultsPage