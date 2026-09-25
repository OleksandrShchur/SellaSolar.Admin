import type { ChipProps } from '@mui/material'
import type { ProjectStatus } from '../api/types'

export const statusLabel = (status: string) => {
  switch (status) {
    case 'Awaiting':
      return 'Очікує'
    case 'Completed':
      return 'Завершено'
    case 'InProgress':
      return 'У роботі'
    default:
      return status
  }
}

export const statusChipColor = (status: string): ChipProps['color'] => {
  switch (status as ProjectStatus) {
    case 'Awaiting':
      return 'warning'
    case 'Completed':
      return 'success'
    case 'InProgress':
      return 'info'
    default:
      return 'default'
  }
}

export const appRoleLabel = (role: string) => {
  switch (role) {
    case 'Admin':
      return 'Адміністратор'
    case 'Worker':
      return 'Виконавець'
    default:
      return role
  }
}

export const workerTypeLabel = (type: string) =>
  type === 'Assembler' ? 'Складальник' : 'Монтажник'

export const formatDate = (value?: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('uk-UA')
}

export const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('uk-UA')
}

export const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(value)
}

export const inventoryLabels = {
  needsPurchase: 'Потрібно закупіти',
  needsOrder: 'Потрібно замовити',
  notInWarehouse: 'Немає на складі',
  onHand: 'На складі',
  available: 'Вільно',
  availableStock: 'Вільно на складі',
  toOrder: 'Замовити',
  needed: 'Потрібно',
  remainingStock: 'Залишок на складі',
  used: 'Використано',
  reserved: 'Зарезервовано',
} as const
