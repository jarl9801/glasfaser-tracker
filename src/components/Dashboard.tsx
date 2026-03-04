import { useMemo } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Network, Cable, CheckCircle, Clock } from 'lucide-react'
import { STATUS_COLORS, STATUS_ORDER } from '../types'
import { StatCard } from './ui/StatCard'
import { ProgressBar } from './ui/ProgressBar'
import { POPSelector } from './ui/POPSelector'
import { usePOPData } from '../lib/usePOPData'

export function Dashboard() {
  const { pops, dps, connections, blowings, splicings } = usePOPData()

  const stats = useMemo(() => {
    const totalDPs = dps.length
    const dpTiefbauDone = dps.filter((d) => d.tiefbauFertig).length
    const dpEinblasenDone = dps.filter((d) => d.einblasen === 'GEREED').length
    const dpSpleissenDone = dps.filter((d) => d.spleissenAP === 'GEREED').length
    const dpSpleisseBereit = dps.filter((d) => d.spleisseDPBereit === 'GEREED').length

    const statusCounts: Record<string, number> = {}
    for (const c of connections) {
      const s = c.status.trim()
      statusCounts[s] = (statusCounts[s] || 0) + 1
    }

    const pieData: { name: string; value: number }[] = []
    for (const s of STATUS_ORDER) {
      if (statusCounts[s]) pieData.push({ name: s, value: statusCounts[s] })
    }
    // Merge variants like "Spleiße " with trailing space
    for (const [s, v] of Object.entries(statusCounts)) {
      if (!STATUS_ORDER.includes(s)) {
        const trimmed = s.trim()
        const existing = pieData.find(p => p.name === trimmed)
        if (existing) existing.value += v
        else pieData.push({ name: s, value: v })
      }
    }

    const abgeliefert = connections.filter((c) => c.status.trim() === 'Abliefern').length
    const pctDone = connections.length > 0 ? Math.round((abgeliefert / connections.length) * 100) : 0

    const totalMeters = blowings.reduce((s, b) => s + b.metrosSoplados, 0)
    const totalFusiones = splicings.reduce((s, sp) => s + sp.fusiones, 0)

    return {
      totalDPs, dpTiefbauDone, dpEinblasenDone, dpSpleissenDone, dpSpleisseBereit,
      pieData, abgeliefert, pctDone, totalMeters, totalFusiones,
    }
  }, [dps, connections, blowings, splicings])

  const barData = useMemo(() => {
    const dpConnectionCounts: Record<string, Record<string, number>> = {}
    for (const c of connections) {
      if (!dpConnectionCounts[c.dp]) dpConnectionCounts[c.dp] = {}
      const s = c.status.trim()
      dpConnectionCounts[c.dp][s] = (dpConnectionCounts[c.dp][s] || 0) + 1
    }
    return Object.entries(dpConnectionCounts)
      .map(([dp, statuses]) => ({
        dp: dp.replace(/QFF-\d+-/, ''),
        ...statuses,
        total: Object.values(statuses).reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)
  }, [connections])

  if (dps.length === 0 && connections.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-400">
        <Cable size={48} className="mb-4" />
        <p className="text-lg font-medium">Keine Daten vorhanden</p>
        <p className="text-sm">Importiere CSV-Dateien, um zu beginnen.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <POPSelector pops={pops} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Verteilerpunkte" value={stats.totalDPs} icon={Network} color="#38608f" />
        <StatCard label="Anschlüsse" value={connections.length} icon={Cable} color="#56B2BC" />
        <StatCard label="Abgeliefert" value={stats.abgeliefert} icon={CheckCircle} color="#22c55e" sub={`${stats.pctDone}% fertig`} />
        <StatCard label="In Bearbeitung" value={connections.length - stats.abgeliefert} icon={Clock} color="#f97316" />
      </div>

      {/* Field work summary */}
      {(blowings.length > 0 || splicings.length > 0) && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Metros soplados (campo)</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{stats.totalMeters.toLocaleString()} m</p>
            <p className="mt-0.5 text-xs text-gray-400">{blowings.length} registros</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Fusiones (campo)</p>
            <p className="mt-1 text-2xl font-bold text-purple-600">{stats.totalFusiones}</p>
            <p className="mt-0.5 text-xs text-gray-400">{splicings.length} reportes</p>
          </div>
        </div>
      )}

      {stats.totalDPs > 0 && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">DP-Fortschritt</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProgressBar label="Tiefbau fertig" value={stats.dpTiefbauDone} max={stats.totalDPs} color="#f97316" />
            <ProgressBar label="Einblasen fertig" value={stats.dpEinblasenDone} max={stats.totalDPs} color="#3b82f6" />
            <ProgressBar label="Spleißen AP fertig" value={stats.dpSpleissenDone} max={stats.totalDPs} color="#8b5cf6" />
            <ProgressBar label="Spleiße DP bereit" value={stats.dpSpleisseBereit} max={stats.totalDPs} color="#22c55e" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {stats.pieData.length > 0 && (
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Status-Verteilung</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.pieData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name.trim()] || '#9ca3af'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {barData.length > 0 && (
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Top 15 DPs nach Anschlüssen</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} layout="vertical" margin={{ left: 60 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="dp" width={70} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {STATUS_ORDER.map((s) => (
                  <Bar key={s} dataKey={s} stackId="a" fill={STATUS_COLORS[s]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
