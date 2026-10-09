import type { ChipProps } from '@mui/material'
import type { ProjectStatus } from '../api/types'

export const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

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

/** Digits only (e.g. before sending phone/card to the API). */
export const digitsOnly = (value: string) => value.replace(/\D/g, '')

/** True when the value contains anything other than digits or spaces. */
export const hasInvalidNumericChars = (value: string) => /[^\d\s]/.test(value)

export const invalidNumericCharMessage = 'Введено недопустимий символ'

/** Keeps up to 16 digits for bank card input. */
export const normalizeCardDigits = (value: string) => digitsOnly(value).slice(0, 16)

const formatCardDigitsGrouped = (digits: string) => {
  const parts: string[] = []
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4))
  }
  return parts.join(' ')
}

/** Formats card digits as `XXXX XXXX XXXX XXXX` for read-only display. */
export const formatCardNumber = (value?: string | null) => {
  const digits = normalizeCardDigits(value ?? '')
  if (!digits) return '—'
  return formatCardDigitsGrouped(digits)
}

/** Same grouping as <formatCardNumber> for form inputs (empty stays empty). */
export const formatCardNumberInput = (value?: string | null) => {
  const digits = normalizeCardDigits(value ?? '')
  if (!digits) return ''
  return formatCardDigitsGrouped(digits)
}

/**
 * Card field onChange: format digit groups, or keep raw text when invalid chars are present
 * so the user sees them and can get an error message.
 */
export const applyCardInputChange = (raw: string) => {
  if (hasInvalidNumericChars(raw)) return raw
  return formatCardNumberInput(raw)
}

export const isCardNumberValid = (value: string) => {
  if (hasInvalidNumericChars(value)) return false
  const digits = normalizeCardDigits(value)
  return digits.length === 0 || digits.length === 16
}

export const cardInputHelperText = (value: string) => {
  if (hasInvalidNumericChars(value)) return invalidNumericCharMessage
  if (!isCardNumberValid(value)) return 'Введіть усі 16 цифр або залиште порожнім'
  return 'Необовʼязково · 16 цифр'
}

/** Formats UA mobile digits as `0XX XXX XX XX` for form inputs. */
export const formatPhoneInput = (value?: string | null) => {
  const digits = digitsOnly(value ?? '').slice(0, 10)
  if (!digits) return ''
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)]
  return parts.filter((p) => p.length > 0).join(' ')
}

/**
 * Phone field onChange: format while typing, or keep raw text when invalid chars are present.
 */
export const applyPhoneInputChange = (raw: string) => {
  if (hasInvalidNumericChars(raw)) return raw
  return formatPhoneInput(raw)
}

export const isPhoneInputValid = (value: string) => !hasInvalidNumericChars(value)

export const phoneInputHelperText = (value: string) => {
  if (hasInvalidNumericChars(value)) return invalidNumericCharMessage
  return 'Формат: 0XX XXX XX XX'
}

/** Formats UA mobile as `0XX XXX XX XX` (digits only in storage). */
export const formatPhone = (value?: string | null) => {
  if (!value) return '—'
  const digits = digitsOnly(value)
  const local = toLocalUaPhone(digits)
  if (local.length === 10 && local.startsWith('0')) {
    return formatPhoneInput(local)
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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export const inventoryLabels = {
  addToCatalog: 'Додати в каталог',
  purchaseRequestsTitle: 'Запити на закупівлю',
  purchaseRequestsExpand: 'Показати запити на закупівлю',
  purchaseRequestsCollapse: 'Сховати запити на закупівлю',
  openOnWarehouse: 'Відкрити на складі',
  openProject: 'Відкрити проект',
  allocateShort: 'Розподілити',
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
  receiveHint: 'Додавання на склад створює нову партію з вказаною ціною за одиницю.',
  noLots: 'Партій ще немає. Додайте першу поставку.',
  editQtyBlockedHint:
    'Щоб зменшити потрібну кількість нижче розподілу — спочатку зменшіть розподіл партій.',
  cannotCompleteIncompleteAllocations:
    'Неможливо завершити: розподіліть усі матеріали зі складу по партіях.',
  generateReport: 'Згенерувати накладну',
  generateReportTitle: 'Накладна проєкту',
  generateReportBlockedTitle: 'Накладну ще не можна згенерувати',
  generateReportBlockedHint:
    'Не всі матеріали закуплені та розподілені по партіях, або проєкт не в статусі «У роботі» / «Завершено».',
  generateReportBlockedItems: 'Проблемні позиції:',
  generateReportPreview: 'Попередній перегляд',
  generateReportPreviewUnavailable:
    'У мобільному браузері попередній перегляд недоступний. Натисніть «Завантажити PDF», щоб відкрити накладну.',
  generateReportDownload: 'Завантажити PDF',
  generateReportGenerating: 'Генерація…',
  generateReportClose: 'Закрити',
  deleteLot: 'Видалити партію',
  deleteLotConfirm: 'Видалити партію?',
  deleteLotInUseTitle: 'Партію неможливо видалити',
  deleteLotInUseHint:
    'Ця партія використовується в відкритих проектах. Спочатку зніміть розподіл.',
} as const

export const projectLabels = {
  delete: 'Видалити',
  deleteConfirmTitle: 'Видалити проект?',
  deleteConfirmMessage: (name: string) =>
    `Видалити «${name}»? Фото буде видалено, працівників буде знято з проекту.`,
  deleteBlockedTitle: 'Проект неможливо видалити',
  deleteBlockedHint:
    'До проекту призначені матеріали. Спочатку приберіть усі матеріали зі вкладки «Матеріали».',
  deleteClose: 'Зрозуміло',
} as const
