import { useMemo, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, ClipboardCheck, Search } from 'lucide-react'
import { normalizeDP, extractPOP } from '../lib/normalize'
import { usePOPData } from '../lib/usePOPData'
import { StatCard } from './ui/StatCard'
import { POPSelector } from './ui/POPSelector'
import type { Connection, FieldBlowing, FieldSplicing } from '../types'

interface DPControlRow {
  dp: string
  // Client data
  clientConnections: number
  clientEinblasen: string
  clientSpleissen: string
  clientSpleisseBereit: string
  // Field data
  fieldBlowings: number
  fieldMeters: number
  fieldSplicings: number
  fieldFusiones: number
  fieldCertified: number
  fieldIncidents: number
  // Calculated
  blowingCoverage: number // % of client connections with matching field blowing
  hasFieldWork: boolean
}

export function ControlPanel() {
  const { pops, connections, dps, blowings, splicings } = usePOPData()
  const [filter, setFilter] = useState<'all' | 'pending' | 'complete' | 'incidents'>('all')
  const [search, setSearch] = useState('')

  const controlData = useMemo(() => {
    // Index field work by normalized DP
    const blowingsByDP: Record<string, FieldBlowing[]> = {}
    for (const b of blowings) {
      const dp = b.dp || normalizeDP(b.dpRaw)
      if (!blowingsByDP[dp]) blowingsByDP[dp] = []
      blowingsByDP[dp].push(b)
    }

    const splicingsByDP: Record<string, FieldSplicing[]> = {}
    for (const sp of splicings) {
      const dp = sp.dp || normalizeDP(sp.dpRaw)
      if (!splicingsByDP[dp]) splicingsByDP[dp] = []
      splicingsByDP[dp].push(sp)
    }

    // Index client connections by DP
    const connectionsByDP: Record<string, Connection[]> = {}
    for (const c of connections) {
      if (!connectionsByDP[c.dp]) connectionsByDP[c.dp] = []
      connectionsByDP[c.dp].push(c)
    }

    // Build control rows per DP
    const allDPKeys = new Set([
      ...Object.keys(connectionsByDP),
      ...Object.keys(blowingsByDP),
      ...Object.keys(splicingsByDP),
    ])

    const rows: DPControlRow[] = []
    for (const dp of allDPKeys) {
      const conns = connectionsByDP[dp] || []
      const bls = blowingsByDP[dp] || []
      const sps = splicingsByDP[dp] || []
      const dpData = dps.find(d => d.dp === dp)

      const fieldCertified = bls.filter(b => b.certificado).length
      const fieldIncidents = bls.filter(b => b.incidencias).length + sps.filter(s => s.incidencias).length

      rows.push({
        dp,
        clientConnections: conns.length,
        clientEinblasen: dpData?.einblasen || '',
        clientSpleissen: dpData?.spleissenAP || '',
        clientSpleisseBereit: dpData?.spleisseDPBereit || '',
        fieldBlowings: bls.length,
        fieldMeters: bls.reduce((s, b) => s + b.metrosSoplados, 0),
        fieldSplicings: sps.length,
        fieldFusiones: sps.reduce((s, sp) => s + sp.fusiones, 0),
        fieldCertified,
        fieldIncidents,
        blowingCoverage: conns.length > 0 ? Math.round((bls.filter(b => b.metrosSoplados > 1).length / conns.length) * 100) : 0,
        hasFieldWork: bls.length > 0 || sps.length > 0,
      })
    }

    rows.sort((a, b) => a.dp.localeCompare(b.dp))
    return rows
  }, [connections, dps, blowings, splicings])

  const filtered = useMemo(() => {
    let result = controlData
    if (filter === 'pending') result = result.filter(r => !r.hasFieldWork && r.clientConnections > 0)
    if (filter === 'complete') result = result.filter(r => r.blowingCoverage >= 80)
    if (filter === 'incidents') result = result.filter(r => r.fieldIncidents > 0)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(r => r.dp.toLowerCase().includes(q))
    }
    return result
  }, [controlData, filter, search])

  const totals = useMemo(() => ({
    totalClientConns: connections.length,
    totalFieldBlowings: blowings.filter(b => b.metrosSoplados > 1).length,
    totalFieldBlowingsAll: blowings.length,
    totalMeters: blowings.reduce((s, b) => s + b.metrosSoplados, 0),
    totalFusiones: splicings.reduce((s, sp) => s + sp.fusiones, 0),
    totalCertified: blowings.filter(b => b.certificado).length,
    totalIncidents: blowings.filter(b => b.incidencias).length + splicings.filter(s => s.incidencias).length,
    dpsWithWork: controlData.filter(r => r.hasFieldWork).length,
    dpsTotal: controlData.length,
  }), [connections, blowings, splicings, controlData])

  if (connections.length === 0 && blowings.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-400">
        <ClipboardCheck size={48} className="mb-4" />
        <p className="text-lg font-medium">Keine Kontrolldaten</p>
        <p className="text-sm">Importiere sowohl Client-CSVs als auch Feldberichte.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Control de Trabajos</h2>
        <POPSelector pops={pops} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cobertura soplado"
          value={`${totals.totalFieldBlowings} / ${totals.totalClientConns}`}
          icon={CheckCircle}
          color="#22c55e"
          sub={`${totals.totalClientConns > 0 ? Math.round((totals.totalFieldBlowings / totals.totalClientConns) * 100) : 0}% ejecutado`}
        />
        <StatCard
          label="Metros soplados"
          value={totals.totalMeters.toLocaleString()}
          icon={ClipboardCheck}
          color="#3b82f6"
          sub={`${totals.totalFieldBlowingsAll} registros`}
        />
        <StatCard
          label="Certificados"
          value={`${totals.totalCertified} / ${totals.totalFieldBlowingsAll}`}
          icon={totals.totalCertified === 0 ? XCircle : CheckCircle}
          color={totals.totalCertified === 0 ? '#ef4444' : '#22c55e'}
          sub={`${totals.totalFieldBlowingsAll > 0 ? Math.round((totals.totalCertified / totals.totalFieldBlowingsAll) * 100) : 0}%`}
        />
        <StatCard
          label="Incidencias"
          value={totals.totalIncidents}
          icon={AlertTriangle}
          color="#f97316"
          sub={`en ${totals.dpsWithWork} DPs con trabajo`}
        />
      </div>

      {/* Summary bar */}
      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Resumen general</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">DPs con trabajo de campo</p>
            <p className="text-lg font-bold text-gray-900">{totals.dpsWithWork} <span className="text-sm font-normal text-gray-400">/ {totals.dpsTotal}</span></p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total fusiones</p>
            <p className="text-lg font-bold text-gray-900">{totals.totalFusiones}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Soplados exitosos</p>
            <p className="text-lg font-bold text-green-600">{totals.totalFieldBlowings}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Soplados con incidencia</p>
            <p className="text-lg font-bold text-orange-500">{blowings.filter(b => b.incidencias).length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar DP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-teal focus:outline-none"
          />
        </div>
        {(['all', 'pending', 'complete', 'incidents'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              filter === f ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' && `Todos (${controlData.length})`}
            {f === 'pending' && `Sin trabajo (${controlData.filter(r => !r.hasFieldWork && r.clientConnections > 0).length})`}
            {f === 'complete' && `>80% (${controlData.filter(r => r.blowingCoverage >= 80).length})`}
            {f === 'incidents' && `Incidencias (${controlData.filter(r => r.fieldIncidents > 0).length})`}
          </button>
        ))}
      </div>

      {/* Control table */}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-3 py-3 text-left font-medium text-gray-600">POP</th>
              <th className="px-3 py-3 text-left font-medium text-gray-600">DP</th>
              <th className="px-3 py-3 text-center font-medium text-gray-600" title="Anschlüsse im System">Anschl.</th>
              <th className="px-3 py-3 text-center font-medium text-gray-600" title="Soplados registrados">Sopl.</th>
              <th className="px-3 py-3 text-right font-medium text-gray-600">Metros</th>
              <th className="px-3 py-3 text-center font-medium text-gray-600" title="Fusiones registradas">Fus.</th>
              <th className="px-3 py-3 text-center font-medium text-gray-600">Cert.</th>
              <th className="px-3 py-3 text-center font-medium text-gray-600">Incid.</th>
              <th className="px-3 py-3 text-left font-medium text-gray-600">Cobertura</th>
              <th className="px-3 py-3 text-center font-medium text-gray-600">Cliente Einbl.</th>
              <th className="px-3 py-3 text-center font-medium text-gray-600">Cliente Spleiß.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.dp} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs text-teal font-medium">{extractPOP(row.dp)}</td>
                <td className="px-3 py-2 font-mono text-xs font-medium text-navy">
                  {row.dp.replace(/QFF-\d+-/, '')}
                </td>
                <td className="px-3 py-2 text-center">{row.clientConnections || <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-2 text-center">
                  {row.fieldBlowings > 0
                    ? <span className="font-medium text-blue-600">{row.fieldBlowings}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {row.fieldMeters > 0 ? row.fieldMeters.toLocaleString() : '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  {row.fieldFusiones > 0
                    ? <span className="font-medium text-purple-600">{row.fieldFusiones}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  {row.fieldCertified > 0
                    ? <CheckCircle size={16} className="inline text-green-500" />
                    : row.hasFieldWork
                      ? <XCircle size={16} className="inline text-red-400" />
                      : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  {row.fieldIncidents > 0
                    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600"><AlertTriangle size={14} />{row.fieldIncidents}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2">
                  {row.clientConnections > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(row.blowingCoverage, 100)}%`,
                            backgroundColor: row.blowingCoverage >= 80 ? '#22c55e' : row.blowingCoverage >= 40 ? '#eab308' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{row.blowingCoverage}%</span>
                    </div>
                  ) : <span className="text-xs text-gray-300">N/A</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  {row.clientEinblasen === 'GEREED'
                    ? <CheckCircle size={16} className="inline text-green-500" />
                    : <XCircle size={16} className="inline text-gray-300" />}
                </td>
                <td className="px-3 py-2 text-center">
                  {row.clientSpleissen === 'GEREED'
                    ? <CheckCircle size={16} className="inline text-green-500" />
                    : <XCircle size={16} className="inline text-gray-300" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
