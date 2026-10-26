import { useContext } from 'react'
import { HealthDataContext } from './healthDataContext.js'

export function useHealthData() {
  const context = useContext(HealthDataContext)
  if (!context) throw new Error('useHealthData must be used within HealthDataProvider')
  return context
}