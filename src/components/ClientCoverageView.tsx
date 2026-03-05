import { useState, useCallback } from 'react'
import { Upload, Download, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { db } from '../lib/db'
import * as XLSX from 'xlsx'

interface ClientRow {
  auftragsnummer: string
  dp: string
  strasse: string
  hausnummer: string
  zusatz: string
  cableId: string
  ka: string
  statusCSV: string
  datum: string
}

interface MatchedRow extends ClientRow {
  soplado: boolean
  fechaSoplado?: string
  tecnico?: string
  metros?: number
}

function normalizeDP(raw: string): string {
  const m = raw.match(/DP-?0*(\d+)/i)
  return m ? `DP${m[1].padStart(3, '0')}` : raw.toUpperCase()
}

function extractKA(cableId: string): string {
  const m = cableId.match(/(KA\d+)/i)
  return m ? m[1].toUpperCase() : ''
}

function parseClientCSV(text: string): ClientRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const header = lines[0].split(';').map(h => h.replace(/"/g, '').trim())
  const idx = (name: string) => header.findIndex(h => h.toLowerCase().includes(name.toLowerCase()))

  const iAuftrag = idx('Auftragsnummer')
  const iDP = idx('DP')
  const iStrasse = idx('Straße')
  const iHaus = idx('Hausnummer')
  const iZusatz = idx('Hausnummernzusatz')
  const iCable = idx('Cable ID')
  const iStatus = idx('Status')
  const iDatum = idx('Datum')

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = line.split(';').map(c => c.replace(/"/g, '').trim())
    const cableId = iCable >= 0 ? cols[iCable] || '' : ''
    const dpRaw = iDP >= 0 ? cols[iDP] || '' : ''
    return {
      auftragsnummer: iAuftrag >= 0 ? cols[iAuftrag] || '' : '',
      dp: dpRaw,
      strasse: iStrasse >= 0 ? cols[iStrasse] || '' : '',
      hausnummer: iHaus >= 0 ? cols[iHaus] || '' : '',
      zusatz: iZusatz >= 0 ? cols[iZusatz] || '' : '',
      cableId,
      ka: extractKA(cableId),
      statusCSV: iStatus >= 0 ? cols[iStatus] || '' : '',
      datum: iDatum >= 0 ? cols[iDatum] || '' : '',
    }
  })
}

type FilterType = 'all' | 'soplado' | 'pendiente'

export function ClientCoverageView() {
  const [rows, setRows] = useState<MatchedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [filename, setFilename] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const processFile = useCallback(async (file: File) => {
    setLoading(true)
    setFilename(file.name)
    try {
      const text = await file.text()
      const clientRows = parseClientCSV(text)
      const blowings = await db.fieldBlowings.toArray()

      // Build lookup map: "DP055_KA28" → blowing record
      const blowingMap = new Map<string, typeof blowings[0]>()
      for (const b of blowings) {
        const dpNorm = normalizeDP(b.dp || '')
        const ka = (b.kaCliente || '').toUpperCase()
        if (dpNorm && ka) blowingMap.set(`${dpNorm}_${ka}`, b)
      }

      const matched: MatchedRow[] = clientRows.map(row => {
        const dpNorm = normalizeDP(row.dp)
        const key = `${dpNorm}_${row.ka}`
        const blowing = blowingMap.get(key)
        return {
          ...row,
          soplado: !!blowing,
          fechaSoplado: blowing?.fechaInicio,
          tecnico: blowing?.tecnico,
          metros: blowing?.metrosSoplados,
        }
      })

      setRows(matched)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const data = rows.map(r => ({
      'Estado': r.soplado ? '✅ SOPLADO' : '❌ Pendiente',
      'Straße': r.strasse,
      'Nr.': r.hausnummer + (r.zusatz ? ` ${r.zusatz}` : ''),
      'DP': r.dp,
      'KA': r.ka,
      'Status Cliente': r.statusCSV,
      'Fecha Soplado': r.fechaSoplado || '',
      'Técnico': r.tecnico || '',
      'Metros': r.metros || '',
      'Auftragsnummer': r.auftragsnummer,
    }))
    const ws = XLSX.utils.json_to_sheet(data)

    // Color rows
    rows.forEach((r, i) => {
      const rowIdx = i + 2
      const fill = r.soplado
        ? { fgColor: { rgb: 'C6EFCE' } }
        : { fgColor: { rgb: 'FFC7CE' } }
      for (let col = 0; col < 10; col++) {
        const cellAddr = XLSX.utils.encode_cell({ r: rowIdx - 1, c: col })
        if (!ws[cellAddr]) ws[cellAddr] = { v: '' }
        ws[cellAddr].s = { fill: { patternType: 'solid', ...fill } }
      }
    })

    XLSX.utils.book_append_sheet(wb, ws, 'Cobertura Soplado')
    XLSX.writeFile(wb, `cobertura-soplado-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const total = rows.length
  const soplados = rows.filter(r => r.soplado).length
  const pendientes = total - soplados
  const pct = total > 0 ? Math.round((soplados / total) * 100) : 0

  const filtered = rows.filter(r => {
    if (filter === 'soplado') return r.soplado
    if (filter === 'pendiente') return !r.soplado
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Cobertura de Soplado</h2>
          <p className="text-sm text-gray-500">Sube el CSV del cliente y compara con los registros del campo</p>
        </div>
        {rows.length > 0 && (
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Download size={16} />
            Exportar Excel
          </button>
        )}
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        <input
          type="file"
          accept=".csv"
          onChange={onFileChange}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <Upload size={32} className="mx-auto mb-3 text-gray-400" />
        <p className="font-medium text-gray-700">
          {filename || 'Arrastra el CSV del cliente aquí o haz clic'}
        </p>
        <p className="mt-1 text-sm text-gray-400">Formato: CSV con separador ";" (exportación cliente)</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw size={24} className="animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Analizando...</span>
        </div>
      )}

      {/* Stats */}
      {rows.length > 0 && !loading && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-4 shadow-sm border border-green-100">
              <p className="text-xs font-medium uppercase tracking-wide text-green-600">✅ Soplados</p>
              <p className="mt-1 text-2xl font-bold text-green-700">{soplados}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-4 shadow-sm border border-red-100">
              <p className="text-xs font-medium uppercase tracking-wide text-red-600">❌ Pendientes</p>
              <p className="mt-1 text-2xl font-bold text-red-700">{pendientes}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4 shadow-sm border border-blue-100">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Cobertura</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">{pct}%</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progreso de soplado</span>
              <span>{soplados} / {total}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-200">
              <div
                className="h-3 rounded-full bg-green-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {(['all', 'soplado', 'pendiente'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {f === 'all' ? `Todos (${total})` : f === 'soplado' ? `✅ Soplados (${soplados})` : `❌ Pendientes (${pendientes})`}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Dirección</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">DP / KA</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status Cliente</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha Soplado</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Técnico</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Metros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((row, i) => (
                    <tr
                      key={i}
                      className={row.soplado ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'}
                    >
                      <td className="px-4 py-3">
                        {row.soplado
                          ? <CheckCircle size={18} className="text-green-600" />
                          : <XCircle size={18} className="text-red-500" />
                        }
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {row.strasse} {row.hausnummer}{row.zusatz ? ` ${row.zusatz}` : ''}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {row.dp}<br />{row.ka}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.statusCSV}</td>
                      <td className="px-4 py-3 text-gray-600">{row.fechaSoplado || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{row.tecnico || '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {row.metros ? `${row.metros}m` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
