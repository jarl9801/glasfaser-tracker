import { LayoutDashboard, Network, Cable, Upload, Wrench, ClipboardCheck, AlertTriangle, BarChart2 } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import type { ViewName } from '../types'

const NAV_ITEMS: { view: ViewName; label: string; icon: typeof LayoutDashboard; section?: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'dps', label: 'Verteilerpunkte', icon: Network, section: 'Cliente' },
  { view: 'connections', label: 'Anschlüsse', icon: Cable },
  { view: 'fieldwork', label: 'Feldberichte', icon: Wrench, section: 'Campo' },
  { view: 'discrepancies', label: 'Discrepancias', icon: AlertTriangle },
  { view: 'coverage', label: 'Cobertura', icon: BarChart2 },
  { view: 'control', label: 'Control', icon: ClipboardCheck, section: 'Sistema' },
  { view: 'import', label: 'CSV Import', icon: Upload },
]

export function Sidebar() {
  const { view, setView } = useAppStore()

  return (
    <aside className="flex h-screen w-60 flex-col bg-slate-800 text-white">
      <div className="flex items-center gap-3 border-b border-slate-700 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal text-white font-bold text-sm">
          GF
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight">Glasfaser</h1>
          <p className="text-[11px] text-slate-400">Tracker</p>
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ view: v, label, icon: Icon, section }, i) => (
          <div key={v}>
            {section && (
              <p className={`${i > 0 ? 'mt-4' : ''} mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500`}>
                {section}
              </p>
            )}
            <button
              onClick={() => setView(v)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                view === v
                  ? 'bg-teal/20 text-teal font-medium'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-700 px-5 py-3 text-[11px] text-slate-500">
        Glasfaser Tracker v1.1
      </div>
    </aside>
  )
}
