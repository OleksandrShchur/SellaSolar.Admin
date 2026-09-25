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
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(value)
}

/** Formats UA mobile as `0XX XXX XX XX` (digits only in storage). */
export const formatPhone = (value?: string | null) => {
  if (!value) return '—'
  const digits = value.replace(/\D/g, '')
  const local = toLocalUaPhone(digits)
  if (local.length === 10 && local.startsWith('0')) {
    return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8)}`
  }
  return value
}

/** `tel:+380…` href for click-to-call, or null if empty. */
export const toTelHref = (value?: string | null): string | null => {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (!digits) return null
  const local = toLocalUaPhone(digits)
  if (local.length === 10 && local.startsWith('0')) {
    return `tel:+38${local}`
  }
  return `tel:+${digits}`
}

function toLocalUaPhone(digits: string) {
  if (digits.length === 12 && digits.startsWith('38')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('8')) return `0${digits.slice(1)}`
  return digits
}

export const formatMoney = (value?: number | null) => {
  if (value === null || value === undefined) return '—'
  return `${formatNumber(value)} ₴`
}

export const inventoryLabels = {
  needsPurchase: 'Потрібно закупіти',
  needsAllocation: 'Потрібно розподілити',
  needsOrder: 'Потрібно замовити',
  notInWarehouse: 'Немає на складі',
  onHand: 'На складі',
  available: 'Вільно',
  availableStock: 'Вільно на складі',
  toOrder: 'Замовити',
  unallocated: 'Не розподілено',
  needed: 'Потрібно',
  remainingStock: 'Залишок на складі',
  used: 'Використано',
  reserved: 'Зарезервовано',
  lots: 'Партії',
  receive: 'Додати на склад',
  receiveStock: 'Додати на склад',
  unitCost: 'Ціна за од.',
  freeOnLot: 'Вільно в партії',
  allocateLots: 'Розподілити партії',
  costFromStock: 'Вартість зі складу',
  fromStock: 'Зі складу',
  allocationHint:
    'Оберіть партії та кількість вручну. Вартість проекту рахується лише за розподіленими партіями.',
  receiveHint: 'Оприбуткування створює нову партію з вказаною ціною за одиницю.',
  noLots: 'Партій ще немає. Оприбуткуйте першу поставку.',
  editQtyBlockedHint:
    'Щоб зменшити потрібну кількість нижче розподілу — спочатку зменшіть розподіл партій.',
} as const
