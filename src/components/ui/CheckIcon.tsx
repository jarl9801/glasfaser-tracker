import { Check, X } from 'lucide-react'

export function CheckIcon({ done }: { done: boolean }) {
  return done ? (
    <Check size={18} className="text-green-500" />
  ) : (
    <X size={18} className="text-gray-300" />
  )
}
