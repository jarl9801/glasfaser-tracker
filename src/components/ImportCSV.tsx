import { useState, useCallback } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { parseAndImportFile, type ParseResult } from '../lib/csvParser'
import { useAppStore } from '../store/appStore'

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls']

export function ImportCSV() {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ParseResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const showToast = useAppStore((s) => s.showToast)

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null)
      setLoading(true)

      const validFiles = Array.from(files).filter((f) =>
        ACCEPTED_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext))
      )
      if (validFiles.length === 0) {
        setError('Keine CSV/XLSX-Dateien gefunden.')
        setLoading(false)
        return
      }

      const newResults: ParseResult[] = []
      for (const file of validFiles) {
        try {
          const result = await parseAndImportFile(file)
          newResults.push(result)
        } catch (err) {
          setError(`Fehler bei ${file.name}: ${(err as Error).message}`)
        }
      }

      setResults((prev) => [...prev, ...newResults])
      setLoading(false)

      if (newResults.length > 0) {
        const total = newResults.reduce((sum, r) => sum + r.rowCount, 0)
        showToast(`${total} Datensätze importiert.`)
      }
    },
    [showToast]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      void handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) void handleFiles(e.target.files)
    },
    [handleFiles]
  )

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-gray-900">Import</h2>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
          dragging
            ? 'border-teal bg-teal/5'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        {loading ? (
          <Loader2 size={48} className="animate-spin text-teal" />
        ) : (
          <Upload size={48} className="text-gray-400" />
        )}
        <p className="mt-4 text-sm font-medium text-gray-600">
          {loading ? 'Importiere...' : 'CSV / XLSX hierher ziehen'}
        </p>
        <p className="mt-1 text-xs text-gray-400">CSV, XLSX o XLS</p>
        <label className="mt-4 cursor-pointer rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-dark transition-colors">
          Dateien auswählen
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            multiple
            onChange={onFileInput}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Importierte Dateien</h3>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm border border-gray-100"
              >
                <FileText size={20} className="text-teal" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{r.label}</p>
                  <p className="text-xs text-gray-500">
                    {r.projektName} — {r.rowCount} Datensätze
                  </p>
                </div>
                <CheckCircle size={20} className="text-green-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 rounded-xl bg-blue-50 p-5 border border-blue-100">
        <h3 className="text-sm font-semibold text-blue-800">5 formatos auto-detectados (CSV + XLSX)</h3>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-blue-700">1. DP-Export (Cliente)</p>
            <p className="mt-0.5 text-xs text-blue-600">Projektnummer, DP, Tiefbau, Einblasen, Spleißen</p>
          </div>
          <div>
            <p className="text-xs font-medium text-blue-700">2. Anschluss-Export (Cliente)</p>
            <p className="mt-0.5 text-xs text-blue-600">Auftragsnummer, DP, Straße, Status...</p>
          </div>
          <div>
            <p className="text-xs font-medium text-blue-700">3. Soplado RD (Campo)</p>
            <p className="mt-0.5 text-xs text-blue-600">DP, Calle, KA, Metros, Color, Fibras, Cert.</p>
          </div>
          <div>
            <p className="text-xs font-medium text-blue-700">4. Soplado RA (Troncal)</p>
            <p className="mt-0.5 text-xs text-blue-600">Fibras, Metros, Color (sin DP/Calle). CSV o XLSX</p>
          </div>
          <div>
            <p className="text-xs font-medium text-blue-700">5. Fusiones DP (Campo)</p>
            <p className="mt-0.5 text-xs text-blue-600">DP, Fusiones, Técnico, Incidencias</p>
          </div>
        </div>
      </div>
    </div>
  )
}
