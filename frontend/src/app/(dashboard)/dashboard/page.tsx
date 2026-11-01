import type { Metadata } from 'next'
import { getServerSession } from '@/actions/auth.actions'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const session = await getServerSession()
  const greetingName = session?.name ?? session?.email ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Welcome back{greetingName ? `, ${greetingName}` : ''}.
        </p>
      </div>

      <a
        href="/notebook"
        className="block rounded-xl border border-zinc-200 p-6 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        <h2 className="text-lg font-semibold">Incident follow-up notebook</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Open your synthetic case, record checks and recover saved follow-up history.
        </p>
      </a>
    </div>
  )
}
