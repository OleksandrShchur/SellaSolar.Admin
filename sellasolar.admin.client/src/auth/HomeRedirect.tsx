import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { defaultHomePath } from './routeAccess'

export default function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={defaultHomePath(user?.roles ?? [])} replace />
}
