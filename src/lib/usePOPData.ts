import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { useAppStore } from '../store/appStore'
import { extractPOP } from './normalize'

/**
 * Hook that returns all data filtered by the active POP selector,
 * plus the list of available POPs.
 */
export function usePOPData() {
  const popFilter = useAppStore((s) => s.popFilter)

  const allDPs = useLiveQuery(() => db.distributionPoints.toArray()) || []
  const allConnections = useLiveQuery(() => db.connections.toArray()) || []
  const allBlowings = useLiveQuery(() => db.fieldBlowings.toArray()) || []
  const allSplicings = useLiveQuery(() => db.fieldSplicings.toArray()) || []

  const pops = useMemo(() => {
    const set = new Set<string>()
    for (const dp of allDPs) {
      const pop = extractPOP(dp.dp)
      if (pop) set.add(pop)
    }
    for (const c of allConnections) {
      const pop = extractPOP(c.dp)
      if (pop) set.add(pop)
    }
    for (const b of allBlowings) {
      const pop = extractPOP(b.dp)
      if (pop) set.add(pop)
      // Also check codigoProyecto for field data
      if (b.codigoProyecto) set.add(b.codigoProyecto)
    }
    for (const sp of allSplicings) {
      const pop = extractPOP(sp.dp)
      if (pop) set.add(pop)
      if (sp.codigoProyecto) set.add(sp.codigoProyecto)
    }
    return Array.from(set).sort()
  }, [allDPs, allConnections, allBlowings, allSplicings])

  const dps = useMemo(() => {
    if (!popFilter) return allDPs
    return allDPs.filter(d => extractPOP(d.dp) === popFilter)
  }, [allDPs, popFilter])

  const connections = useMemo(() => {
    if (!popFilter) return allConnections
    return allConnections.filter(c => extractPOP(c.dp) === popFilter)
  }, [allConnections, popFilter])

  const blowings = useMemo(() => {
    if (!popFilter) return allBlowings
    return allBlowings.filter(b => {
      const pop = extractPOP(b.dp)
      return pop === popFilter || b.codigoProyecto === popFilter
    })
  }, [allBlowings, popFilter])

  const splicings = useMemo(() => {
    if (!popFilter) return allSplicings
    return allSplicings.filter(sp => {
      const pop = extractPOP(sp.dp)
      return pop === popFilter || sp.codigoProyecto === popFilter
    })
  }, [allSplicings, popFilter])

  return { pops, dps, connections, blowings, splicings, popFilter }
}
