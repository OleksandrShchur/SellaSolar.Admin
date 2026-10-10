import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from './AuthContext'
import type { AppRole } from '../api/types'

type Props = {
  roles?: AppRole[]
}

export default function ProtectedRoute({ roles }: Props) {
  const { user, loading, hasRole, isLoggingOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
        <CircularProgress color="primary" />
      </Box>
    )
  }

  if (!user) {
    // Intentional logout must not resume the previous page after the next login.
    return (
      <Navigate
        to="/login"
        replace
        state={isLoggingOut ? null : { from: location.pathname }}
      />
    )
  }

  if (roles && roles.length > 0 && !roles.some((r) => hasRole(r))) {
    return <Navigate to="/no-access" replace />
  }

  return <Outlet />
}
