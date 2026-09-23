import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import theme from './theme'
import AppLayout from './layout/AppLayout'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import WarehousePage from './pages/WarehousePage'
import WarehouseDetailPage from './pages/WarehouseDetailPage'
import WorkersPage from './pages/WorkersPage'

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/warehouse" element={<WarehousePage />} />
            <Route path="/warehouse/:id" element={<WarehouseDetailPage />} />
            <Route path="/workers" element={<WorkersPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
