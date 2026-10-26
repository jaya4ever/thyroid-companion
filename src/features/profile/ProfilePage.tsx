import { useState } from 'react'
import type { FormEvent, SetStateAction } from 'react'
import { Button } from '@chakra-ui/react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useHealthData } from '../../context/useHealthData.js'
import type { HealthDataContextValue } from '../../context/healthDataContext.js'
import type { HeightUnit, ThyroidCondition, UserProfile, WeightEntry, WeightUnit } from '../../types/health'
import {
  calculateAge,
  convertKilogramsToWeight,
  convertWeightToKilograms,
  feetAndInchesToMeters,
  filterWeightEntries,
  toIsoDate,
  validateWeightEntry,
} from '../../health/healthUtils.js'

const conditionOptions: ThyroidCondition[] = [
  'Hypothyroidism',
  "Hashimoto's thyroiditis",
  'Hyperthyroidism',
  'Thyroid nodules',
  'Other thyroid condition',
]

const weightRanges = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 'all', label: 'All' },
] satisfies { value: number | 'all'; label: string }[]

interface ProfileDraft {
  name: string
  dateOfBirth: string
  heightUnit: HeightUnit
  heightCm: string
  heightFeet: string
  heightInches: string
  weightUnit: WeightUnit
  currentWeight: string
  goalWeight: string
  thyroidConditions: ThyroidCondition[]
}

type ProfileErrors = Partial<Record<'name' | 'dateOfBirth' | 'height' | 'currentWeight' | 'goalWeight', string>>

function displayWeight(weightKg: number | null, unit: WeightUnit): string {
  const value = convertKilogramsToWeight(weightKg, unit)
  return value === null ? 'Not recorded' : `${value.toFixed(1)} ${unit}`
}

function displayHeight(profile: UserProfile): string {
  if (profile.heightUnit === 'cm') return `${profile.heightCm.toFixed(1)} cm`
  const totalInches = profile.heightCm / 2.54
  const feet = Math.floor(totalInches / 12)
  return `${feet} ft ${(totalInches - (feet * 12)).toFixed(1)} in`
}

function numberString(value: number | null): string {
  return value === null ? '' : Number(value).toFixed(1)
}

function createDraft(profile: UserProfile, latestWeightEntry: WeightEntry | null): ProfileDraft {
  const totalInches = profile.heightCm / 2.54
  const feet = Math.floor(totalInches / 12)
  const inches = totalInches - (feet * 12)
  return {
    name: profile.name,
    dateOfBirth: profile.dateOfBirth,
    heightUnit: profile.heightUnit,
    heightCm: numberString(profile.heightCm),
    heightFeet: String(feet),
    heightInches: numberString(inches),
    weightUnit: profile.weightUnit,
    currentWeight: latestWeightEntry
      ? numberString(convertKilogramsToWeight(latestWeightEntry.weightKg, profile.weightUnit))
      : '',
    goalWeight: numberString(convertKilogramsToWeight(profile.goalWeightKg, profile.weightUnit)),
    thyroidConditions: [...profile.thyroidConditions],
  }
}

function getHeightInCentimeters(draft: ProfileDraft): number | null {
  if (draft.heightUnit === 'cm') {
    const height = Number(draft.heightCm)
    return Number.isFinite(height) && height > 0 ? height : null
  }
  const heightMeters = feetAndInchesToMeters(draft.heightFeet, draft.heightInches)
  return heightMeters === null ? null : heightMeters * 100
}

function changeWeightUnit(draft: ProfileDraft, unit: WeightUnit): ProfileDraft {
  const currentKg = convertWeightToKilograms(draft.currentWeight, draft.weightUnit)
  const goalKg = convertWeightToKilograms(draft.goalWeight, draft.weightUnit)
  return {
    ...draft,
    weightUnit: unit,
    currentWeight: numberString(convertKilogramsToWeight(currentKg, unit)),
    goalWeight: numberString(convertKilogramsToWeight(goalKg, unit)),
  }
}

function changeHeightUnit(draft: ProfileDraft, unit: HeightUnit): ProfileDraft {
  const heightCm = getHeightInCentimeters(draft)
  const totalInches = heightCm === null ? 0 : heightCm / 2.54
  const feet = Math.floor(totalInches / 12)
  return {
    ...draft,
    heightUnit: unit,
    heightCm: numberString(heightCm),
    heightFeet: String(feet),
    heightInches: numberString(totalInches - (feet * 12)),
  }
}

interface ProfileFormProps {
  profile: UserProfile
  latestWeightEntry: WeightEntry | null
  saveProfile: HealthDataContextValue['saveProfile']
  onCancel: () => void
  onSaved: () => void
}

function ProfileForm({ profile, latestWeightEntry, saveProfile, onCancel, onSaved }: ProfileFormProps) {
  const [draft, setDraft] = useState(() => createDraft(profile, latestWeightEntry))
  const [errors, setErrors] = useState<ProfileErrors>({})

  function updateField<Field extends keyof ProfileDraft>(field: Field, value: ProfileDraft[Field]): void {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  function toggleCondition(condition: ThyroidCondition): void {
    setDraft((current) => ({
      ...current,
      thyroidConditions: current.thyroidConditions.includes(condition)
        ? current.thyroidConditions.filter((item) => item !== condition)
        : [...current.thyroidConditions, condition],
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const nextErrors: ProfileErrors = {}
    const name = draft.name.trim()
    const age = calculateAge(draft.dateOfBirth)
    const heightCm = getHeightInCentimeters(draft)
    const currentWeightKg = convertWeightToKilograms(draft.currentWeight, draft.weightUnit)
    const goalWeightKg = convertWeightToKilograms(draft.goalWeight, draft.weightUnit)

    if (!name) nextErrors.name = 'Enter a full name.'
    if (age === null) nextErrors.dateOfBirth = 'Enter a valid date of birth that is not in the future.'
    if (heightCm === null) {
      nextErrors.height = draft.heightUnit === 'cm'
        ? 'Enter a height greater than zero.'
        : 'Enter feet and inches from 0 to less than 12 inches.'
    }
    if (currentWeightKg === null) nextErrors.currentWeight = 'Enter a current weight greater than zero.'
    if (goalWeightKg === null) nextErrors.goalWeight = 'Enter a goal weight greater than zero.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (heightCm === null || currentWeightKg === null || goalWeightKg === null) return

    const saved = saveProfile({
      name,
      dateOfBirth: draft.dateOfBirth,
      heightCm,
      heightUnit: draft.heightUnit,
      weightUnit: draft.weightUnit,
      goalWeightKg,
      thyroidConditions: draft.thyroidConditions,
    }, currentWeightKg)

    if (saved) onSaved()
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <div className="form-field">
          <label className="field-label" htmlFor="profile-name">Full name</label>
          <input
            className="field-input"
            id="profile-name"
            autoComplete="name"
            value={draft.name}
            onChange={(event) => updateField('name', event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'profile-name-error' : undefined}
          />
          {errors.name && <span className="field-error" id="profile-name-error">{errors.name}</span>}
        </div>

        <div className="form-field">
          <label className="field-label" htmlFor="profile-dob">Date of birth</label>
          <input
            className="field-input"
            id="profile-dob"
            type="date"
            value={draft.dateOfBirth}
            max={toIsoDate(new Date())}
            onChange={(event) => updateField('dateOfBirth', event.target.value)}
            aria-invalid={Boolean(errors.dateOfBirth)}
            aria-describedby={errors.dateOfBirth ? 'profile-dob-error' : 'profile-age-hint'}
          />
          {errors.dateOfBirth
            ? <span className="field-error" id="profile-dob-error">{errors.dateOfBirth}</span>
            : <span className="field-hint" id="profile-age-hint">Age: {calculateAge(draft.dateOfBirth) ?? 'Not available'}</span>}
        </div>
      </div>

      <fieldset className="form-field form-field-wide">
        <legend className="field-label">Height</legend>
        <div className="unit-field-row">
          <select
            className="field-input field-select"
            aria-label="Height unit"
            value={draft.heightUnit}
            onChange={(event) => {
              const unit = event.target.value
              if (unit === 'cm' || unit === 'imperial') {
                setDraft((current) => changeHeightUnit(current, unit))
              }
            }}
          >
            <option value="cm">Centimeters</option>
            <option value="imperial">Feet and inches</option>
          </select>
          {draft.heightUnit === 'cm' ? (
            <label className="unit-input-wrap">
              <span className="visually-hidden">Height in centimeters</span>
              <input className="field-input" type="number" min="0" step="0.1" inputMode="decimal" value={draft.heightCm} onChange={(event) => updateField('heightCm', event.target.value)} aria-invalid={Boolean(errors.height)} aria-describedby={errors.height ? 'profile-height-error' : undefined} />
              <span className="unit-suffix">cm</span>
            </label>
          ) : (
            <div className="imperial-inputs">
              <label className="unit-input-wrap">
                <span className="visually-hidden">Height in feet</span>
                <input className="field-input" type="number" min="0" step="1" inputMode="numeric" value={draft.heightFeet} onChange={(event) => updateField('heightFeet', event.target.value)} aria-invalid={Boolean(errors.height)} aria-describedby={errors.height ? 'profile-height-error' : undefined} />
                <span className="unit-suffix">ft</span>
              </label>
              <label className="unit-input-wrap">
                <span className="visually-hidden">Height in inches</span>
                <input className="field-input" type="number" min="0" max="11.9" step="0.1" inputMode="decimal" value={draft.heightInches} onChange={(event) => updateField('heightInches', event.target.value)} aria-invalid={Boolean(errors.height)} aria-describedby={errors.height ? 'profile-height-error' : undefined} />
                <span className="unit-suffix">in</span>
              </label>
            </div>
          )}
        </div>
        {errors.height && <span className="field-error" id="profile-height-error">{errors.height}</span>}
      </fieldset>

      <div className="form-grid">
        <div className="form-field">
          <label className="field-label" htmlFor="profile-weight-unit">Weight units</label>
          <select
            className="field-input field-select"
            id="profile-weight-unit"
            value={draft.weightUnit}
            onChange={(event) => {
              const unit = event.target.value
              if (unit === 'kg' || unit === 'lb') {
                setDraft((current) => changeWeightUnit(current, unit))
              }
            }}
          >
            <option value="kg">Kilograms</option>
            <option value="lb">Pounds</option>
          </select>
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="profile-current-weight">Current weight ({draft.weightUnit})</label>
          <input className="field-input" id="profile-current-weight" type="number" min="0" step="0.1" inputMode="decimal" value={draft.currentWeight} onChange={(event) => updateField('currentWeight', event.target.value)} aria-invalid={Boolean(errors.currentWeight)} aria-describedby={errors.currentWeight ? 'profile-current-weight-error' : undefined} />
          {errors.currentWeight && <span className="field-error" id="profile-current-weight-error">{errors.currentWeight}</span>}
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="profile-goal-weight">Goal weight ({draft.weightUnit})</label>
          <input className="field-input" id="profile-goal-weight" type="number" min="0" step="0.1" inputMode="decimal" value={draft.goalWeight} onChange={(event) => updateField('goalWeight', event.target.value)} aria-invalid={Boolean(errors.goalWeight)} aria-describedby={errors.goalWeight ? 'profile-goal-weight-error' : undefined} />
          {errors.goalWeight && <span className="field-error" id="profile-goal-weight-error">{errors.goalWeight}</span>}
        </div>
      </div>

      <fieldset className="form-field form-field-wide">
        <legend className="field-label">Thyroid condition(s)</legend>
        <div className="condition-list">
          {conditionOptions.map((condition) => (
            <label className="condition-option" key={condition}>
              <input
                type="checkbox"
                checked={draft.thyroidConditions.includes(condition)}
                onChange={() => toggleCondition(condition)}
              />
              <span>{condition}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="form-actions">
        <Button className="primary-action" type="submit">Save profile</Button>
        <Button className="secondary-action" type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

interface ProfileSummaryProps {
  profile: UserProfile
  latestWeightEntry: WeightEntry | null
  bmi: number | null
  onEdit: () => void
}

function ProfileSummary({ profile, latestWeightEntry, bmi, onEdit }: ProfileSummaryProps) {
  const age = calculateAge(profile.dateOfBirth)
  const conditions = profile.thyroidConditions.length > 0
    ? profile.thyroidConditions.join(', ')
    : 'Not specified'

  return (
    <section className="panel" aria-labelledby="profile-summary-title">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title" id="profile-summary-title">Personal details</h2>
          <p className="panel-caption">Fictional profile details for this prototype</p>
        </div>
        <Button className="secondary-action" type="button" onClick={onEdit}>Edit profile</Button>
      </div>
      <dl className="profile-details">
        <div><dt>Full name</dt><dd>{profile.name}</dd></div>
        <div><dt>Date of birth</dt><dd>{profile.dateOfBirth}</dd></div>
        <div><dt>Age</dt><dd>{age === null ? 'Not available' : `${age} years`}</dd></div>
        <div><dt>Height</dt><dd>{displayHeight(profile)}</dd></div>
        <div><dt>Current weight</dt><dd>{latestWeightEntry ? displayWeight(latestWeightEntry.weightKg, profile.weightUnit) : 'Not recorded'}</dd></div>
        <div><dt>Goal weight</dt><dd>{displayWeight(profile.goalWeightKg, profile.weightUnit)}</dd></div>
        <div className="profile-detail-wide"><dt>Thyroid condition(s)</dt><dd>{conditions}</dd></div>
      </dl>
      <div className="bmi-summary" aria-live="polite">
        <div>
          <p className="metric-label">Body mass index (BMI)</p>
          <p className="bmi-value">{bmi === null ? 'Not available' : bmi.toFixed(1)}</p>
        </div>
        <p className="bmi-explanation">
          BMI is a screening measurement based on height and weight. It does not diagnose a health condition and does not account for every aspect of health.
        </p>
      </div>
    </section>
  )
}

function GoalSummary({ profile, latestWeightEntry }: Pick<ProfileSummaryProps, 'profile' | 'latestWeightEntry'>) {
  if (!latestWeightEntry) return <p className="field-hint">Add a weight entry to compare it with your goal.</p>

  const difference = Math.abs(profile.goalWeightKg - latestWeightEntry.weightKg)
  const label = difference < 0.05
    ? 'At your goal weight'
    : `${displayWeight(difference, profile.weightUnit)} ${latestWeightEntry.weightKg > profile.goalWeightKg ? 'above' : 'below'} your goal`

  return <p className="goal-difference">{label}</p>
}

interface WeightChartProps {
  entries: WeightEntry[]
  range: number | 'all'
  setRange: (value: SetStateAction<number | 'all'>) => void
  unit: WeightUnit
}

function WeightChart({ entries, range, setRange, unit }: WeightChartProps) {
  const visibleEntries = filterWeightEntries(entries, range)
  const chartData = visibleEntries.map((entry) => ({
    date: entry.date,
    label: new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: convertKilogramsToWeight(entry.weightKg, unit),
  }))

  return (
    <section className="weight-history-section" aria-labelledby="weight-history-title">
      <div className="panel-heading weight-history-heading">
        <div>
          <h2 className="panel-title" id="weight-history-title">Weight history</h2>
          <p className="panel-caption">Your demo entries, shown in chronological order ({unit})</p>
        </div>
        <div className="range-buttons" role="group" aria-label="Weight history date range">
          {weightRanges.map((item) => (
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
      {chartData.length > 0 ? (
        <div className="chart-wrap weight-history-chart" role="img" aria-label={`Weight history chart with ${chartData.length} fictional entries in ${unit}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="profileWeightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8cb6a0" stopOpacity={0.26} />
                  <stop offset="95%" stopColor="#8cb6a0" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#edf1eb" strokeDasharray="3 5" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#8c9990', fontSize: 10 }} tickMargin={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8c9990', fontSize: 10 }} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <div className="chart-tooltip"><strong>{Number(payload[0].value).toFixed(1)} {unit}</strong>{label} - demo entry</div>
              ) : null} />
              <Area type="monotone" dataKey="weight" stroke="#4f866f" strokeWidth={2.5} fill="url(#profileWeightFill)" dot={{ r: 3, fill: '#4f866f', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="inline-empty-state" role="status">No weight entries in this date range.</div>
      )}
    </section>
  )
}

function WeightEntryForm({ addWeightEntry, unit }: Pick<HealthDataContextValue, 'addWeightEntry'> & { unit: WeightUnit }) {
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(() => toIsoDate(new Date()))
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const validationMessage = validateWeightEntry(weight, date)
    if (validationMessage) {
      setError(validationMessage)
      setStatus('')
      return
    }

    const result = addWeightEntry(weight, unit, date)
    if (result) {
      setError(result)
      setStatus('')
      return
    }
    setWeight('')
    setError('')
    setStatus('Weight entry added for this demo session.')
  }

  return (
    <form className="weight-entry-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label className="field-label" htmlFor="new-weight">Weight ({unit})</label>
        <input className="field-input" id="new-weight" type="number" min="0" step="0.1" inputMode="decimal" value={weight} onChange={(event) => { setWeight(event.target.value); setError(''); setStatus('') }} aria-invalid={Boolean(error)} aria-describedby={error ? 'new-weight-error' : undefined} />
      </div>
      <div className="form-field">
        <label className="field-label" htmlFor="new-weight-date">Measurement date</label>
        <input className="field-input" id="new-weight-date" type="date" max={toIsoDate(new Date())} value={date} onChange={(event) => { setDate(event.target.value); setError(''); setStatus('') }} aria-invalid={Boolean(error)} aria-describedby={error ? 'new-weight-error' : undefined} />
      </div>
      <Button className="primary-action" type="submit">Add entry</Button>
      {error && <span className="field-error form-message" id="new-weight-error" role="alert">{error}</span>}
      {status && <span className="form-status form-message" role="status">{status}</span>}
    </form>
  )
}

function WeightEntryRow({ entry, unit, editWeightEntry, deleteWeightEntry }: Pick<HealthDataContextValue, 'editWeightEntry' | 'deleteWeightEntry'> & { entry: WeightEntry; unit: WeightUnit }) {
  const [isEditing, setIsEditing] = useState(false)
  const [weight, setWeight] = useState(numberString(convertKilogramsToWeight(entry.weightKg, unit)))
  const [date, setDate] = useState(entry.date)
  const [error, setError] = useState('')

  function handleSave(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const validationMessage = validateWeightEntry(weight, date)
    if (validationMessage) {
      setError(validationMessage)
      return
    }
    const result = editWeightEntry(entry.id, weight, unit, date)
    if (result) {
      setError(result)
      return
    }
    setError('')
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <tr>
        <td colSpan={3}>
          <form className="record-edit-form" onSubmit={handleSave}>
            <label>
              <span className="visually-hidden">Edit weight ({unit})</span>
              <input className="field-input" type="number" min="0" step="0.1" value={weight} onChange={(event) => { setWeight(event.target.value); setError('') }} aria-invalid={Boolean(error)} />
            </label>
            <label>
              <span className="visually-hidden">Edit measurement date</span>
              <input className="field-input" type="date" max={toIsoDate(new Date())} value={date} onChange={(event) => { setDate(event.target.value); setError('') }} aria-invalid={Boolean(error)} />
            </label>
            <Button className="primary-action" type="submit">Save</Button>
            <Button className="secondary-action" type="button" onClick={() => { setIsEditing(false); setError('') }}>Cancel</Button>
            {error && <span className="field-error form-message" role="alert">{error}</span>}
          </form>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td>{new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
      <td>{displayWeight(entry.weightKg, unit)}</td>
      <td>
        <div className="record-actions">
          <Button className="text-button" type="button" onClick={() => setIsEditing(true)}>Edit<span className="visually-hidden"> entry from {entry.date}</span></Button>
          <Button className="text-button text-button-danger" type="button" onClick={() => {
            if (window.confirm('Delete this fictional weight entry?')) deleteWeightEntry(entry.id)
          }}>Delete<span className="visually-hidden"> entry from {entry.date}</span></Button>
        </div>
      </td>
    </tr>
  )
}

function WeightHistoryTable({ entries, unit, editWeightEntry, deleteWeightEntry }: Pick<HealthDataContextValue, 'editWeightEntry' | 'deleteWeightEntry'> & { entries: WeightEntry[]; unit: WeightUnit }) {
  return (
    <div className="table-scroll">
      <table className="demo-data-table weight-table">
        <caption className="visually-hidden">Fictional weight entries in chronological order</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">Weight</th><th scope="col">Actions</th></tr></thead>
        <tbody>
          {entries.map((entry) => (
            <WeightEntryRow key={entry.id} entry={entry} unit={unit} editWeightEntry={editWeightEntry} deleteWeightEntry={deleteWeightEntry} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProfilePage() {
  const {
    profile,
    weightEntries,
    latestWeightEntry,
    bmi,
    saveProfile,
    addWeightEntry,
    editWeightEntry,
    deleteWeightEntry,
  } = useHealthData()
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [range, setRange] = useState<number | 'all'>(90)
  const [profileStatus, setProfileStatus] = useState('')

  function cancelProfileEdit() {
    setIsEditingProfile(false)
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Your details and measurements</p>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">A personal overview with fictional demo information.</p>
        </div>
      </header>

      <div className="profile-page-grid">
        {profileStatus && <p className="form-status profile-page-status" role="status">{profileStatus}</p>}
        {isEditingProfile ? (
          <section className="panel" aria-labelledby="edit-profile-title">
            <div className="panel-heading">
              <div>
                <h2 className="panel-title" id="edit-profile-title">Edit personal details</h2>
                <p className="panel-caption">Changes stay in memory and disappear when you refresh.</p>
              </div>
            </div>
            <ProfileForm
              key={`${profile.name}-${profile.dateOfBirth}-${latestWeightEntry?.id ?? 'empty'}`}
              profile={profile}
              latestWeightEntry={latestWeightEntry}
              saveProfile={saveProfile}
              onCancel={cancelProfileEdit}
              onSaved={() => {
                setIsEditingProfile(false)
                setProfileStatus('Profile updated for this demo session only.')
              }}
            />
          </section>
        ) : (
          <ProfileSummary profile={profile} latestWeightEntry={latestWeightEntry} bmi={bmi} onEdit={() => { setProfileStatus(''); setIsEditingProfile(true) }} />
        )}

        <section className="panel weight-tracker-panel" aria-labelledby="weight-tracking-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="weight-tracking-title">Weight tracking</h2>
              <p className="panel-caption">Record measurements and view your personal history.</p>
            </div>
          </div>
          <div className="weight-summary-grid">
            <div className="weight-summary-item">
              <span className="metric-label">Latest recorded weight</span>
              <strong>{latestWeightEntry ? displayWeight(latestWeightEntry.weightKg, profile.weightUnit) : 'Not recorded'}</strong>
              <span className="field-hint">{latestWeightEntry ? `Recorded ${latestWeightEntry.date}` : 'Add an entry below'}</span>
            </div>
            <div className="weight-summary-item">
              <span className="metric-label">Goal weight</span>
              <strong>{displayWeight(profile.goalWeightKg, profile.weightUnit)}</strong>
              <GoalSummary profile={profile} latestWeightEntry={latestWeightEntry} />
            </div>
          </div>
          <WeightEntryForm addWeightEntry={addWeightEntry} unit={profile.weightUnit} />
          <WeightChart entries={weightEntries} range={range} setRange={setRange} unit={profile.weightUnit} />
          {weightEntries.length > 0 ? (
            <WeightHistoryTable entries={weightEntries} unit={profile.weightUnit} editWeightEntry={editWeightEntry} deleteWeightEntry={deleteWeightEntry} />
          ) : (
            <div className="inline-empty-state" role="status">No weight entries yet. Add your first fictional demo entry above to start a history.</div>
          )}
        </section>
      </div>
      <p className="temporary-data-note" role="note">These fictional demo changes are temporary and disappear after a page refresh. No health information is saved or sent anywhere.</p>
    </>
  )
}

export default ProfilePage
