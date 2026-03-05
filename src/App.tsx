import { Layout } from './components/Layout'
import { Dashboard } from './components/Dashboard'
import { DPOverview } from './components/DPOverview'
import { ConnectionsTable } from './components/ConnectionsTable'
import { FieldWork } from './components/FieldWork'
import { ControlPanel } from './components/ControlPanel'
import { ImportCSV } from './components/ImportCSV'
import { DiscrepanciesView } from './components/DiscrepanciesView'
import { ClientCoverageView } from './components/ClientCoverageView'
import { useAppStore } from './store/appStore'

function App() {
  const view = useAppStore((s) => s.view)

  return (
    <Layout>
      {view === 'dashboard' && <Dashboard />}
      {view === 'dps' && <DPOverview />}
      {view === 'connections' && <ConnectionsTable />}
      {view === 'fieldwork' && <FieldWork />}
      {view === 'control' && <ControlPanel />}
      {view === 'import' && <ImportCSV />}
      {view === 'discrepancies' && <DiscrepanciesView />}
      {view === 'coverage' && <ClientCoverageView />}
    </Layout>
  )
}

export default App
