import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function HomeRedirect() {
  const { hasRole } = useAuth()
  if (hasRole('Worker') && !hasRole('Admin') && !hasRole('Manager')) {
    return <Navigate to="/my-jobs" replace />
  }
  if (hasRole('Admin')) {
    return <Navigate to="/users" replace />
  }
  return <Navigate to="/projects" replace />
}
