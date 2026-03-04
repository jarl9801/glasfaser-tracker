import { create } from 'zustand'
import type { ViewName } from '../types'

interface AppState {
  view: ViewName
  setView: (view: ViewName) => void
  popFilter: string | null
  setPopFilter: (pop: string | null) => void
  selectedDP: string | null
  setSelectedDP: (dp: string | null) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  statusFilter: string | null
  setStatusFilter: (status: string | null) => void
  toast: { message: string; type: 'success' | 'error' } | null
  showToast: (message: string, type?: 'success' | 'error') => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  setView: (view) => set({ view, selectedDP: null, searchQuery: '', statusFilter: null }),
  popFilter: null,
  setPopFilter: (pop) => set({ popFilter: pop, selectedDP: null }),
  selectedDP: null,
  setSelectedDP: (dp) => set({ selectedDP: dp }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  statusFilter: null,
  setStatusFilter: (status) => set({ statusFilter: status }),
  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } })
    setTimeout(() => set({ toast: null }), 3000)
  },
}))
