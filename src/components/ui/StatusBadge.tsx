import { STATUS_COLORS } from '../../types'

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status.trim()] || '#9ca3af'

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {status.trim()}
    </span>
  )
}
