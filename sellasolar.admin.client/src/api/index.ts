import { apiGet, apiSend, apiUpload } from './client'
import type {
  AppRole,
  CurrentUser,
  NonCatalogPurchaseRequest,
  ProjectDetail,
  ProjectExpense,
  ProjectItem,
  ProjectListItem,
  ProjectPhoto,
  ProjectStatus,
  ProjectWorker,
  WarehouseItemDetail,
  WarehouseItemList,
  WarehouseStockLot,
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
  addItem: (
    id: number,
    body:
      | { warehouseItemId: number; quantityNeeded: number }
      | {
          quantityNeeded: number
          requestedName: string
          requestedCategory: string
          requestedUnit: string
        },
  ) => apiSend<ProjectItem>(`/api/projects/${id}/items`, 'POST', body),
  updateItem: (id: number, itemId: number, quantityNeeded: number) =>
    apiSend<ProjectItem>(`/api/projects/${id}/items/${itemId}`, 'PUT', { quantityNeeded }),
  setItemAllocations: (
    id: number,
    itemId: number,
    allocations: { warehouseStockLotId: number; quantity: number }[],
  ) =>
    apiSend<ProjectItem>(`/api/projects/${id}/items/${itemId}/allocations`, 'PUT', { allocations }),
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
  addExpense: (
    id: number,
    body: {
      category: string
      amount: number
      expenseDate?: string | null
      notes?: string | null
    },
  ) => apiSend<ProjectExpense>(`/api/projects/${id}/expenses`, 'POST', body),
  updateExpense: (
    id: number,
    expenseId: number,
    body: {
      category: string
      amount: number
      expenseDate?: string | null
      notes?: string | null
    },
  ) => apiSend<ProjectExpense>(`/api/projects/${id}/expenses/${expenseId}`, 'PUT', body),
  removeExpense: (id: number, expenseId: number) =>
    apiSend<void>(`/api/projects/${id}/expenses/${expenseId}`, 'DELETE'),
}

export const warehouseApi = {
  list: (params?: {
    category?: string
    search?: string
    lowStockOnly?: boolean
    needsPurchaseOnly?: boolean
  }) =>
    apiGet<WarehouseItemList[]>(
      `/api/warehouse-items${qs({
        category: params?.category,
        search: params?.search,
        lowStockOnly: params?.lowStockOnly,
        needsPurchaseOnly: params?.needsPurchaseOnly,
      })}`,
    ),
  purchaseRequests: () => apiGet<NonCatalogPurchaseRequest[]>('/api/warehouse-items/purchase-requests'),
  categories: () => apiGet<string[]>('/api/warehouse-items/categories'),
  get: (id: number) => apiGet<WarehouseItemDetail>(`/api/warehouse-items/${id}`),
  lots: (id: number) => apiGet<WarehouseStockLot[]>(`/api/warehouse-items/${id}/lots`),
  receive: (
    id: number,
    body: {
      quantity: number
      unitCost: number
      supplier?: string | null
      notes?: string | null
      receivedAt?: string | null
      allocateToProjectItemId?: number | null
      allocateQuantity?: number | null
    },
  ) => apiSend<WarehouseItemDetail>(`/api/warehouse-items/${id}/receive`, 'POST', body),
  create: (body: unknown) => apiSend<WarehouseItemDetail>('/api/warehouse-items', 'POST', body),
  update: (id: number, body: unknown) =>
    apiSend<WarehouseItemDetail>(`/api/warehouse-items/${id}`, 'PUT', body),
  remove: (id: number) => apiSend<void>(`/api/warehouse-items/${id}`, 'DELETE'),
}
