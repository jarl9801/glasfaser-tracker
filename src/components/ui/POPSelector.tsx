import { useAppStore } from '../../store/appStore'

interface POPSelectorProps {
  pops: string[]
}

export function POPSelector({ pops }: POPSelectorProps) {
  const { popFilter, setPopFilter } = useAppStore()

  if (pops.length <= 1) return null

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setPopFilter(null)}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
          !popFilter ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        Alle POPs
      </button>
      {pops.map((pop) => (
        <button
          key={pop}
          onClick={() => setPopFilter(popFilter === pop ? null : pop)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium font-mono transition-colors ${
            popFilter === pop ? 'bg-teal text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {pop}
        </button>
      ))}
    </div>
  )
}
