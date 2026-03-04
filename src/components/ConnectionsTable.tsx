import { useMemo, useState, useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, X, Filter } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { usePOPData } from '../lib/usePOPData'
import { StatusBadge } from './ui/StatusBadge'
import { POPSelector } from './ui/POPSelector'
import { STATUS_ORDER } from '../types'

export function ConnectionsTable() {
  const { pops, connections } = usePOPData()
  const { selectedDP, setSelectedDP, searchQuery, setSearchQuery, statusFilter, setStatusFilter } = useAppStore()
  const [sortCol, setSortCol] = useState<string>('strasse')
  const [sortAsc, setSortAsc] = useState(true)
  const parentRef = useRef<HTMLDivElement>(null)

  const uniqueDPs = useMemo(() => {
    const set = new Set(connections.map((c) => c.dp))
    return Array.from(set).sort()
  }, [connections])

  const uniqueStreets = useMemo(() => {
    const set = new Set(connections.map((c) => c.strasse))
    return Array.from(set).sort()
  }, [connections])

  const [streetFilter, setStreetFilter] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = connections

    if (selectedDP) result = result.filter((c) => c.dp === selectedDP)
    if (statusFilter) result = result.filter((c) => c.status.trim() === statusFilter)
    if (streetFilter) result = result.filter((c) => c.strasse === streetFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.auftragsnummer.toLowerCase().includes(q) ||
          c.strasse.toLowerCase().includes(q) ||
          c.hausnummer.includes(q) ||
          c.cableId.toLowerCase().includes(q) ||
          c.dp.toLowerCase().includes(q)
      )
    }

    result.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortCol]
      const bVal = (b as Record<string, unknown>)[sortCol]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      const aNum = Number(aVal) || 0
      const bNum = Number(bVal) || 0
      return sortAsc ? aNum - bNum : bNum - aNum
    })

    return result
  }, [connections, selectedDP, statusFilter, streetFilter, searchQuery, sortCol, sortAsc])

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 20,
  })

  const toggleSort = useCallback((col: string) => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortAsc((a) => !a)
        return col
      }
      setSortAsc(true)
      return col
    })
  }, [])

  const hasFilters = selectedDP || statusFilter || streetFilter || searchQuery

  const columns = [
    { key: 'dp', label: 'DP', width: 'w-24' },
    { key: 'strasse', label: 'Straße', width: 'w-44' },
    { key: 'hausnummer', label: 'Nr.', width: 'w-16' },
    { key: 'hausnummernzusatz', label: 'Zus.', width: 'w-12' },
    { key: 'unit', label: 'Unit', width: 'w-14' },
    { key: 'status', label: 'Status', width: 'w-36' },
    { key: 'farbeRohre', label: 'Farbe', width: 'w-24' },
    { key: 'cableId', label: 'Kabel-ID', width: 'w-52' },
    { key: 'grundNA', label: 'Grund', width: 'w-16' },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">
          Anschlüsse
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({filtered.length} von {connections.length})
          </span>
        </h2>
        <POPSelector pops={pops} />
        {hasFilters && (
          <button
            onClick={() => {
              setSelectedDP(null)
              setStatusFilter(null)
              setStreetFilter(null)
              setSearchQuery('')
            }}
            className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200"
          >
            <X size={14} /> Filter zurücksetzen
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-teal focus:outline-none"
          />
        </div>

        <select
          value={selectedDP || ''}
          onChange={(e) => setSelectedDP(e.target.value || null)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none"
        >
          <option value="">Alle DPs</option>
          {uniqueDPs.map((dp) => (
            <option key={dp} value={dp}>
              {dp.replace('QFF-001-', '')}
            </option>
          ))}
        </select>

        <select
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none"
        >
          <option value="">Alle Status</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={streetFilter || ''}
          onChange={(e) => setStreetFilter(e.target.value || null)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none"
        >
          <option value="">Alle Straßen</option>
          {uniqueStreets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {hasFilters && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Filter size={14} />
            {filtered.length} Ergebnisse
          </div>
        )}
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100">
        <div className="border-b border-gray-100 bg-gray-50">
          <div className="flex">
            {columns.map((col) => (
              <button
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className={`${col.width} shrink-0 px-3 py-3 text-left text-xs font-medium text-gray-600 hover:text-gray-900`}
              >
                {col.label}
                {sortCol === col.key && (sortAsc ? ' ↑' : ' ↓')}
              </button>
            ))}
          </div>
        </div>

        <div ref={parentRef} className="overflow-auto" style={{ height: 'calc(100vh - 300px)' }}>
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const c = filtered[virtualRow.index]
              return (
                <div
                  key={virtualRow.key}
                  className="absolute left-0 top-0 flex w-full items-center border-b border-gray-50 text-sm hover:bg-gray-50"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="w-24 shrink-0 px-3 font-mono text-xs text-navy">
                    {c.dp.replace('QFF-001-', '')}
                  </div>
                  <div className="w-44 shrink-0 truncate px-3 text-gray-700">{c.strasse}</div>
                  <div className="w-16 shrink-0 px-3 text-gray-700">{c.hausnummer}</div>
                  <div className="w-12 shrink-0 px-3 text-gray-500">{c.hausnummernzusatz}</div>
                  <div className="w-14 shrink-0 px-3 text-gray-500">{c.unit}</div>
                  <div className="w-36 shrink-0 px-3">
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="w-24 shrink-0 px-3 text-xs text-gray-500">{c.farbeRohre}</div>
                  <div className="w-52 shrink-0 truncate px-3 font-mono text-xs text-gray-500">
                    {c.cableId}
                  </div>
                  <div className="w-16 shrink-0 px-3 text-xs text-gray-500">{c.grundNA}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
