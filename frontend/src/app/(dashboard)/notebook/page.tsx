import type { Metadata } from 'next'
import { Notebook } from '@/features/notebook/Notebook'

export const metadata: Metadata = { title: 'Incident follow-up notebook' }

export default function NotebookPage() {
  return <Notebook />
}
