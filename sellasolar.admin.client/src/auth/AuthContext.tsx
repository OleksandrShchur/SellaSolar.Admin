import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiGet, apiLogin, apiSend, clearCsrfToken, ensureCsrfToken, setUnauthorizedHandler } from '../api/client'
import type { AppRole, CurrentUser } from '../api/types'

type AuthState = {
  user: CurrentUser | null
  loading: boolean
  login: (phone: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  hasRole: (...roles: AppRole[]) => boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      await ensureCsrfToken()
      const me = await apiGet<CurrentUser>('/api/auth/me')
      setUser(me)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      clearCsrfToken()
    })
    void (async () => {
      setLoading(true)
      await refresh()
      setLoading(false)
    })()
  }, [refresh])

  const login = useCallback(async (phone: string, password: string) => {
    await ensureCsrfToken()
    const response = await apiLogin<CurrentUser>('/api/auth/login', { phone, password })
    setUser({
      userId: response.userId,
      username: response.username,
      fullName: response.fullName,
      roles: response.roles,
    })
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiSend('/api/auth/logout', 'POST')
    } finally {
      clearCsrfToken()
      setUser(null)
    }
  }, [])

  const hasRole = useCallback(
    (...roles: AppRole[]) => roles.some((r) => user?.roles.includes(r)),
    [user],
  )

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refresh,
      hasRole,
      isAdmin: hasRole('Admin'),
    }),
    [user, loading, login, logout, refresh, hasRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
