import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color?: string
  sub?: string
}

export function StatCard({ label, value, icon: Icon, color = '#56B2BC', sub }: StatCardProps) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: `${color}20` }}>
          <Icon size={24} style={{ color }} />
        </div>
      </div>
    </div>
  )
}
