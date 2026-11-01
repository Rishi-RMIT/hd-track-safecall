import { z } from 'zod'

export const noteSchema = z
  .string()
  .trim()
  .min(10, 'Write at least 10 characters.')
  .max(500, 'Use at most 500 characters.')

export const SAMPLE_DEVICE = 'SC-DEMO-01'
export const SAMPLE_CONTEXT =
  'Synthetic pendant: no heartbeat during a simulated maintenance window. Record checks and the next follow-up; no operational action is performed.'
