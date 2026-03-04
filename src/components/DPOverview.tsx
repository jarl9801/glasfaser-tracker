import { useMemo } from 'react'
import { useAppStore } from '../store/appStore'
import { usePOPData } from '../lib/usePOPData'
import { extractPOP } from '../lib/normalize'
import { CheckIcon } from './ui/CheckIcon'
import { POPSelector } from './ui/POPSelector'
import { STATUS_COLORS } from '../types'

export function DPOverview() {
  const { pops, dps, connections } = usePOPData()
  const { setView, setSelectedDP } = useAppStore()

  const dpStats = useMemo(() => {
    const stats: Record<string, { total: number; abgeliefert: number; statuses: Record<string, number> }> = {}
    for (const c of connections) {
      if (!stats[c.dp]) stats[c.dp] = { total: 0, abgeliefert: 0, statuses: {} }
      stats[c.dp].total++
      const s = c.status.trim()
      stats[c.dp].statuses[s] = (stats[c.dp].statuses[s] || 0) + 1
      if (s === 'Abliefern') stats[c.dp].abgeliefert++
    }
    return stats
  }, [connections])

  if (dps.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-400">
        <p className="text-lg font-medium">Keine Verteilerpunkte</p>
        <p className="text-sm">Importiere die DP-CSV-Datei.</p>
      </div>
    )
  }

  const sorted = [...dps].sort((a, b) => a.dp.localeCompare(b.dp))

  const navigateToDP = (dp: string) => {
    setSelectedDP(dp)
    setView('connections')
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Verteilerpunkte ({dps.length})</h2>
        <POPSelector pops={pops} />
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">POP</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">DP</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Tiefbau</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Einblasen</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Spleißen AP</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Spleiße DP</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Anschlüsse</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Fortschritt</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((dp) => {
              const stats = dpStats[dp.dp] || { total: 0, abgeliefert: 0, statuses: {} }
              const pop = extractPOP(dp.dp)
              return (
                <tr
                  key={dp.id}
                  className="border-b border-gray-50 transition-colors hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigateToDP(dp.dp)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-teal font-medium">{pop}</td>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-navy">
                    {dp.dp.replace(/QFF-\d+-/, '')}
                  </td>
                  <td className="px-4 py-3 text-center"><CheckIcon done={dp.tiefbauFertig} /></td>
                  <td className="px-4 py-3 text-center"><CheckIcon done={dp.einblasen === 'GEREED'} /></td>
                  <td className="px-4 py-3 text-center"><CheckIcon done={dp.spleissenAP === 'GEREED'} /></td>
                  <td className="px-4 py-3 text-center"><CheckIcon done={dp.spleisseDPBereit === 'GEREED'} /></td>
                  <td className="px-4 py-3 text-gray-700">{stats.total}</td>
                  <td className="w-48 px-4 py-3">
                    {stats.total > 0 ? (
                      <div className="flex h-4 w-full overflow-hidden rounded-full">
                        {Object.entries(stats.statuses).map(([status, count]) => (
                          <div
                            key={status}
                            className="h-full transition-all"
                            style={{
                              width: `${(count / stats.total) * 100}%`,
                              backgroundColor: STATUS_COLORS[status.trim()] || '#9ca3af',
                            }}
                            title={`${status}: ${count}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Keine</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
