import { type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { useAppStore } from '../store/appStore'

export function Layout({ children }: { children: ReactNode }) {
  const toast = useAppStore((s) => s.toast)

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
