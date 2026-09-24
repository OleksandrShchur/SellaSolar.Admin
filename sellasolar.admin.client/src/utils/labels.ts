export const statusLabel = (status: string) =>
  status === 'Completed' ? 'Завершено' : 'У роботі'

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
