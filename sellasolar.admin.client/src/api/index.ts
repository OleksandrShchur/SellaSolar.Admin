import { apiGet, apiSend, apiUpload } from './client'
import type {
  AppRole,
  CurrentUser,
  ProjectDetail,
  ProjectItem,
  ProjectListItem,
  ProjectPhoto,
  ProjectStatus,
  ProjectWorker,
  WarehouseItemDetail,
  WarehouseItemList,
  UserListItem,
  WorkerType,
} from './types'

export const authApi = {
  me: () => apiGet<CurrentUser>('/api/auth/me'),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiSend<void>('/api/auth/change-password', 'POST', body),
}

export const usersApi = {
  list: (params?: {
    role?: AppRole | ''
    isActive?: boolean
    isBlocked?: boolean
    search?: string
  }) =>
    apiGet<UserListItem[]>(
      `/api/users${qs({
        role: params?.role,
        isActive: params?.isActive,
        isBlocked: params?.isBlocked,
        search: params?.search,
      })}`,
    ),
  workersForAssignment: () => apiGet<UserListItem[]>('/api/users/workers'),
  get: (id: string) => apiGet<UserListItem>(`/api/users/${id}`),
  create: (body: {
    password: string
    fullName: string
    role: AppRole
    phone: string
    workerType?: WorkerType | null
  }) => apiSend<UserListItem>('/api/users', 'POST', body),
  update: (
    id: string,
    body: {
      fullName: string
      role: AppRole
      phone: string
      workerType?: WorkerType | null
    },
  ) => apiSend<UserListItem>(`/api/users/${id}`, 'PUT', body),
  resetPassword: (id: string, body: { newPassword: string }) =>
    apiSend<void>(`/api/users/${id}/reset-password`, 'POST', body),
  activate: (id: string) => apiSend<void>(`/api/users/${id}/activate`, 'POST'),
  deactivate: (id: string) => apiSend<void>(`/api/users/${id}/deactivate`, 'POST'),
  block: (id: string) => apiSend<void>(`/api/users/${id}/block`, 'POST'),
  unblock: (id: string) => apiSend<void>(`/api/users/${id}/unblock`, 'POST'),
}

function qs(params: Record<string, string | boolean | undefined | null>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(key, String(value))
  })
  const value = search.toString()
  return value ? `?${value}` : ''
}

export const projectsApi = {
  list: (status?: string, search?: string) =>
    apiGet<ProjectListItem[]>(`/api/projects${qs({ status, search })}`),
  mine: () => apiGet<ProjectListItem[]>('/api/my-jobs'),
  get: (id: number) => apiGet<ProjectDetail>(`/api/projects/${id}`),
  create: (body: unknown) => apiSend<ProjectDetail>('/api/projects', 'POST', body),
  update: (id: number, body: unknown) => apiSend<ProjectDetail>(`/api/projects/${id}`, 'PUT', body),
  updateStatus: (id: number, status: ProjectStatus) =>
    apiSend<ProjectDetail>(`/api/projects/${id}/status`, 'PATCH', { status }),
  remove: (id: number) => apiSend<void>(`/api/projects/${id}`, 'DELETE'),
  addItem: (id: number, warehouseItemId: number, quantityNeeded: number) =>
    apiSend<ProjectItem>(`/api/projects/${id}/items`, 'POST', { warehouseItemId, quantityNeeded }),
  removeItem: (id: number, itemId: number) =>
    apiSend<void>(`/api/projects/${id}/items/${itemId}`, 'DELETE'),
  assignWorker: (id: number, userId: string, roleOnProject?: string) =>
    apiSend<ProjectWorker>(`/api/projects/${id}/workers`, 'POST', { userId, roleOnProject }),
  removeWorker: (id: number, assignmentId: number) =>
    apiSend<void>(`/api/projects/${id}/workers/${assignmentId}`, 'DELETE'),
  uploadPhoto: (id: number, file: File, caption?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (caption) form.append('caption', caption)
    return apiUpload<ProjectPhoto>(`/api/projects/${id}/photos`, form)
  },
  removePhoto: (id: number, photoId: number) =>
    apiSend<void>(`/api/projects/${id}/photos/${photoId}`, 'DELETE'),
}

export const warehouseApi = {
  list: (params?: { category?: string; search?: string; lowStockOnly?: boolean }) =>
    apiGet<WarehouseItemList[]>(
      `/api/warehouse-items${qs({
        category: params?.category,
        search: params?.search,
        lowStockOnly: params?.lowStockOnly,
      })}`,
    ),
  categories: () => apiGet<string[]>('/api/warehouse-items/categories'),
  get: (id: number) => apiGet<WarehouseItemDetail>(`/api/warehouse-items/${id}`),
  create: (body: unknown) => apiSend<WarehouseItemDetail>('/api/warehouse-items', 'POST', body),
  update: (id: number, body: unknown) =>
    apiSend<WarehouseItemDetail>(`/api/warehouse-items/${id}`, 'PUT', body),
  remove: (id: number) => apiSend<void>(`/api/warehouse-items/${id}`, 'DELETE'),
}
