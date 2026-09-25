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

export interface ProjectItemLotAllocation {
  lotId: number
  unitCost: number
  quantity: number
  receivedAt: string
  quantityFreeOnLot?: number | null
}

export interface ProjectItem {
  id: number
  warehouseItemId?: number | null
  name: string
  category: string
  unit: string
  quantityNeeded: number
  quantityFromStock: number
  quantityToPurchase: number
  needsPurchase: boolean
  quantityInStock: number
  /** On-hand minus reserved by other open projects. */
  quantityAvailable: number
  isNonCatalog: boolean
  allocations: ProjectItemLotAllocation[]
  /** Sum of quantity × unitCost over allocations. */
  costFromStock?: number | null
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
  /** On-hand minus reserved by open projects. */
  quantityAvailable: number
  supplier?: string | null
  notes?: string | null
  lowStockThreshold?: number | null
  isLowStock: boolean
  usedInProjectsCount: number
  quantityToOrder: number
}

export interface WarehouseStockLot {
  lotId: number
  unitCost: number
  quantityOnHand: number
  quantityReserved: number
  quantityFree: number
  receivedAt: string
  supplier?: string | null
  notes?: string | null
}

export interface WarehouseItemProjectUsage {
  projectId: number
  projectName: string
  projectStatus: ProjectStatus
  quantityNeeded: number
  quantityFromStock: number
  needsPurchase: boolean
}

export interface WarehouseItemDetail {
  id: number
  name: string
  category: string
  unit: string
  quantityInStock: number
  quantityAvailable: number
  supplier?: string | null
  notes?: string | null
  lowStockThreshold?: number | null
  isLowStock: boolean
  lots: WarehouseStockLot[]
  projects: WarehouseItemProjectUsage[]
}

export interface NonCatalogPurchaseRequest {
  projectItemId: number
  projectId: number
  projectName: string
  projectStatus: ProjectStatus
  name: string
  category: string
  unit: string
  quantityToPurchase: number
}
