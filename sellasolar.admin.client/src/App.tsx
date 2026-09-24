import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import theme from './theme'
import AppLayout from './layout/AppLayout'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import HomeRedirect from './auth/HomeRedirect'
import LoginPage from './pages/LoginPage'
import NoAccessPage from './pages/NoAccessPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import WarehousePage from './pages/WarehousePage'
import WarehouseDetailPage from './pages/WarehouseDetailPage'
import UsersPage from './pages/UsersPage'
import UserDetailPage from './pages/UserDetailPage'
import MyJobsPage from './pages/MyJobsPage'

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/no-access" element={<NoAccessPage />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/my-jobs" element={<MyJobsPage />} />
                <Route element={<ProtectedRoute roles={['Admin']} />}>
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/projects/:id" element={<ProjectDetailPage />} />
                  <Route path="/warehouse" element={<WarehousePage />} />
                  <Route path="/warehouse/:id" element={<WarehouseDetailPage />} />
                </Route>
                <Route element={<ProtectedRoute roles={['Admin']} />}>
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/users/:id" element={<UserDetailPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
