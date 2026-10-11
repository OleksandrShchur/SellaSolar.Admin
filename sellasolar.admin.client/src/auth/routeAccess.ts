import type { AppRole } from '../api/types'

/** Paths that require Admin (matches nested ProtectedRoute roles in App.tsx). */
const ADMIN_PATH_PREFIXES = ['/projects', '/warehouse', '/users']

/** Project detail is readable by assigned workers; list stays Admin-only. */
const PROJECT_DETAIL_PATH = /^\/projects\/\d+(\/|$)/

export function defaultHomePath(roles: readonly AppRole[]): string {
  const isWorkerOnly = roles.includes('Worker') && !roles.includes('Admin')
  return isWorkerOnly ? '/my-jobs' : '/projects'
}

export function canAccessPath(path: string, roles: readonly AppRole[]): boolean {
  const pathname = path.split('?')[0]?.split('#')[0] ?? ''
  if (!pathname.startsWith('/') || pathname === '/login') return false

  if (PROJECT_DETAIL_PATH.test(pathname)) {
    return roles.includes('Admin') || roles.includes('Worker')
  }

  const needsAdmin = ADMIN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
  if (needsAdmin) return roles.includes('Admin')
  return true
}

/** Prefer return URL when the signed-in user can open it; otherwise role home. */
export function resolvePostLoginPath(
  requestedPath: string | undefined,
  roles: readonly AppRole[],
): string {
  if (requestedPath && canAccessPath(requestedPath, roles)) {
    return requestedPath
  }
  return defaultHomePath(roles)
}
