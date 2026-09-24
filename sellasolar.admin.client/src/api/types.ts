export type ProjectStatus = 'Awaiting' | 'InProgress' | 'Completed'
export type WorkerType = 'Assembler' | 'Installer'
export type AppRole = 'Admin' | 'Worker'

export interface CurrentUser {
  userId: string
  username: string
  fullName: string
  roles: AppRole[]
}

export interface UserListItem {
  id: string
  username: string
  fullName: string
  role: AppRole
  phone?: string | null
  workerType?: WorkerType | null
  isActive: boolean
  isBlocked: boolean
  blockedAt?: string | null
  failedLoginCount: number
  createdAt: string
}

export interface CustomData {
  key: string
  value: string
}

export interface ProjectListItem {
  id: number
  name: string
  address: string
  status: ProjectStatus
  customerName: string
  customerPhone: string
  startDate?: string | null
  endDate?: string | null
  createdAt: string
  assignedWorkerCount: number
  hasPurchaseNeeds: boolean
}

export interface ProjectItem {
  id: number
  warehouseItemId: number
  warehouseItemName: string
  category: string
  unit: string
  quantityNeeded: number
  quantityFromStock: number
  quantityToPurchase: number
  needsPurchase: boolean
  quantityInStock: number
}

export interface ProjectWorker {
  id: number
  userId: string
  fullName: string
  workerType?: WorkerType | null
  phone?: string | null
  roleOnProject?: string | null
  assignedAt: string
}

export interface ProjectPhoto {
  id: number
  url: string
  caption?: string | null
  uploadedAt: string
}

export interface ProjectDetail {
  id: number
  name: string
  description?: string | null
  address: string
  status: ProjectStatus
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  startDate?: string | null
  endDate?: string | null
  createdAt: string
  updatedAt: string
  customData: CustomData[]
  items: ProjectItem[]
  workers: ProjectWorker[]
  photos: ProjectPhoto[]
}

export interface WarehouseItemList {
  id: number
  name: string
  category: string
  unit: string
  quantityInStock: number
  price?: number | null
  supplier?: string | null
  notes?: string | null
  lowStockThreshold?: number | null
  isLowStock: boolean
  usedInProjectsCount: number
}

export interface WarehouseItemProjectUsage {
  projectId: number
  projectName: string
  projectStatus: ProjectStatus
  quantityNeeded: number
  needsPurchase: boolean
}

export interface WarehouseItemDetail extends Omit<WarehouseItemList, 'usedInProjectsCount'> {
  projects: WarehouseItemProjectUsage[]
}
