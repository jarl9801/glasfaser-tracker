import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle, Wrench, Zap, Cloud } from 'lucide-react'
import { usePOPData } from '../lib/usePOPData'
import { StatCard } from './ui/StatCard'
import { POPSelector } from './ui/POPSelector'
import { SheetsSync } from './SheetsSync'

export function FieldWork() {
  const { pops, blowings, splicings } = usePOPData()
  const [tab, setTab] = useState<'blowing' | 'splicing'>('blowing')

  const blowingStats = useMemo(() => {
    const total = blowings.length
    const totalMeters = blowings.reduce((s, b) => s + b.metrosSoplados, 0)
    const certified = blowings.filter(b => b.certificado).length
    const withIncidents = blowings.filter(b => b.incidencias).length
    const uniqueDPs = new Set(blowings.map(b => b.dp)).size
    return { total, totalMeters, certified, withIncidents, uniqueDPs }
  }, [blowings])

  const splicingStats = useMemo(() => {
    const total = splicings.length
    const totalFusions = splicings.reduce((s, sp) => s + sp.fusiones, 0)
    const withIncidents = splicings.filter(sp => sp.incidencias).length
    const uniqueDPs = new Set(splicings.map(sp => sp.dp)).size
    return { total, totalFusions, withIncidents, uniqueDPs }
  }, [splicings])

  if (blowings.length === 0 && splicings.length === 0) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Feldberichte</h2>
          <POPSelector pops={pops} />
        </div>
        
        <SheetsSync />
        
        <div className="mt-6 flex h-[40vh] flex-col items-center justify-center rounded-xl bg-gray-50 text-gray-400">
          <Cloud size={48} className="mb-4" />
          <p className="text-lg font-medium">Keine Feldberichte</p>
          <p className="text-sm">Sincroniza desde Google Sheets o importiere CSV-Dateien.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Feldberichte</h2>
        <POPSelector pops={pops} />
      </div>
      
      <div className="mb-6">
        <SheetsSync />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Soplados registrados" value={blowingStats.total} icon={Zap} color="#3b82f6" sub={`${blowingStats.uniqueDPs} DPs`} />
        <StatCard label="Metros soplados" value={blowingStats.totalMeters.toLocaleString()} icon={Zap} color="#56B2BC" />
        <StatCard label="Fusiones registradas" value={splicingStats.totalFusions} icon={Wrench} color="#8b5cf6" sub={`${splicingStats.total} reportes`} />
        <StatCard label="Con incidencias" value={blowingStats.withIncidents + splicingStats.withIncidents} icon={AlertTriangle} color="#f97316" />
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('blowing')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'blowing' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Soplado ({blowings.length})
        </button>
        <button
          onClick={() => setTab('splicing')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'splicing' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Fusiones ({splicings.length})
        </button>
      </div>

      {tab === 'blowing' && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-3 py-3 text-left font-medium text-gray-600">Fecha</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">POP</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">DP</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">Calle</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">Calle (match)</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">KA</th>
                <th className="px-3 py-3 text-right font-medium text-gray-600">Metros</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">Color</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">Fibras</th>
                <th className="px-3 py-3 text-center font-medium text-gray-600">Cert.</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">Técnico</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">Incidencias</th>
              </tr>
            </thead>
            <tbody>
              {blowings.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-500">{b.fechaInicio}</td>
                  <td className="px-3 py-2 font-mono text-xs text-teal font-medium">{b.codigoProyecto}</td>
                  <td className="px-3 py-2 font-mono text-xs text-navy">{b.dp.replace(/QFF-\d+-/, '')}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate" title={b.calle}>{b.calle}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs ${b.matchConfidence >= 90 ? 'text-green-600' : b.matchConfidence >= 70 ? 'text-yellow-600' : 'text-red-500'}`}>
                      {b.calleNormalized}
                      {b.matchConfidence > 0 && <span className="ml-1 text-[10px]">({b.matchConfidence}%)</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{b.kaCliente}</td>
                  <td className="px-3 py-2 text-right font-medium">{b.metrosSoplados > 1 ? b.metrosSoplados : <span className="text-red-500">!</span>}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="text-gray-500">{b.colorMiniducto}</span>
                    <span className="ml-1 text-gray-400">→ {b.colorNormalized}</span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs">{b.numeroFibras}</td>
                  <td className="px-3 py-2 text-center">
                    {b.certificado
                      ? <CheckCircle size={16} className="inline text-green-500" />
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 max-w-[100px] truncate">{b.tecnico}</td>
                  <td className="px-3 py-2 text-xs text-red-600 max-w-[200px] truncate" title={b.incidencias}>
                    {b.incidencias || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'splicing' && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-3 py-3 text-left font-medium text-gray-600">Fecha</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">POP</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">DP</th>
                <th className="px-3 py-3 text-right font-medium text-gray-600">Fusiones</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">Técnico</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">Incidencias</th>
              </tr>
            </thead>
            <tbody>
              {splicings.map((sp) => (
                <tr key={sp.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-500">{sp.fechaInicio}</td>
                  <td className="px-3 py-2 font-mono text-xs text-teal font-medium">{sp.codigoProyecto}</td>
                  <td className="px-3 py-2 font-mono text-xs text-navy">{sp.dp.replace(/QFF-\d+-/, '')}</td>
                  <td className="px-3 py-2 text-right font-bold">{sp.fusiones}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{sp.tecnico}</td>
                  <td className="px-3 py-2 text-xs text-red-600 max-w-[300px] truncate" title={sp.incidencias}>
                    {sp.incidencias || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
