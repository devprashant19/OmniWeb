import { Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Landing from './pages/Landing'
import WorkflowBuilder from './pages/WorkflowBuilder'
import LiveRun from './pages/LiveRun'
import HealingPipeline from './pages/HealingPipeline'
import Observatory from './pages/Observatory'
import Marketplace from './pages/Marketplace'
import Tenant from './pages/Tenant'

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/build" element={<WorkflowBuilder />} />
          <Route path="/runs/:id" element={<LiveRun />} />
          <Route path="/healing" element={<HealingPipeline />} />
          <Route path="/observatory" element={<Observatory />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/tenant" element={<Tenant />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
