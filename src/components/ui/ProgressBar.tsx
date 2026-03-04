interface ProgressBarProps {
  value: number
  max: number
  color?: string
  label?: string
  showCount?: boolean
}

export function ProgressBar({ value, max, color = '#56B2BC', label, showCount = true }: ProgressBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0

  return (
    <div>
      {label && (
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-gray-600">{label}</span>
          <span className="font-medium text-gray-900">
            {showCount ? `${value}/${max}` : `${pct}%`}
          </span>
        </div>
      )}
      <div className="h-2.5 w-full rounded-full bg-gray-200">
        <div
          className="h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
