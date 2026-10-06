let csrfToken: string | null = null
let onUnauthorized: ((message: string) => void) | null = null

export function setUnauthorizedHandler(handler: (message: string) => void) {
  onUnauthorized = handler
}

export async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken
  const response = await fetch('/api/auth/antiforgery', { credentials: 'include' })
  if (!response.ok) {
    throw new Error('Не вдалося отримати CSRF-токен')
  }
  const data = (await response.json()) as { token?: string }
  csrfToken = data.token ?? null
  if (!csrfToken) {
    throw new Error('Не вдалося отримати CSRF-токен')
  }
  return csrfToken
}

export function clearCsrfToken() {
  csrfToken = null
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (data?.message) return data.message
    if (typeof data === 'string') return data
  } catch {
    // ignore
  }
  return `Помилка запиту (${response.status})`
}

function buildHeaders(method: string, body?: unknown): HeadersInit | undefined {
  const needsJson = body !== undefined
  const isMutating = method !== 'GET' && method !== 'HEAD'
  if (!needsJson && !isMutating) return undefined

  const headers: Record<string, string> = {}
  if (needsJson) headers['Content-Type'] = 'application/json'
  if (isMutating && csrfToken) headers['X-XSRF-TOKEN'] = csrfToken
  return headers
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    clearCsrfToken()
    const message = await parseError(response)
    onUnauthorized?.(message || 'Сесію завершено. Увійдіть знову.')
    throw new Error(message || 'Сесію завершено. Увійдіть знову.')
  }
  if (!response.ok) throw new Error(await parseError(response))
  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export async function apiGet<T>(url: string): Promise<T> {
  await ensureCsrfToken()
  const response = await fetch(url, { credentials: 'include' })
  return handleResponse<T>(response)
}

export async function apiSend<T>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T | void> {
  await ensureCsrfToken()
  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: buildHeaders(method, body),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return handleResponse<T>(response)
}

export type UploadProgress = {
  loaded: number
  total: number
  percent: number
}

function parseXhrError(xhr: XMLHttpRequest): string {
  try {
    const data = JSON.parse(xhr.responseText) as { message?: string } | string
    if (typeof data === 'string' && data) return data
    if (typeof data === 'object' && data?.message) return data.message
  } catch {
    // ignore
  }
  return `Помилка запиту (${xhr.status})`
}

export async function apiUpload<T>(
  url: string,
  formData: FormData,
  onProgress?: (progress: UploadProgress) => void,
): Promise<T> {
  await ensureCsrfToken()

  if (!onProgress) {
    const headers: Record<string, string> = {}
    if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData,
    })
    return handleResponse<T>(response)
  }

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.withCredentials = true
    if (csrfToken) xhr.setRequestHeader('X-XSRF-TOKEN', csrfToken)

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return
      onProgress({
        loaded: event.loaded,
        total: event.total,
        percent: Math.min(100, Math.round((event.loaded / event.total) * 100)),
      })
    }

    xhr.onload = () => {
      if (xhr.status === 401) {
        clearCsrfToken()
        const message = parseXhrError(xhr) || 'Сесію завершено. Увійдіть знову.'
        onUnauthorized?.(message)
        reject(new Error(message))
        return
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(parseXhrError(xhr)))
        return
      }
      if (xhr.status === 204 || !xhr.responseText) {
        resolve(undefined as T)
        return
      }
      try {
        resolve(JSON.parse(xhr.responseText) as T)
      } catch {
        reject(new Error('Некоректна відповідь сервера'))
      }
    }

    xhr.onerror = () => reject(new Error('Помилка мережі під час завантаження'))
    xhr.onabort = () => reject(new Error('Завантаження скасовано'))
    xhr.send(formData)
  })
}

/** Fetches a binary response (PDF, etc.) with auth cookies. */
export async function apiGetBlob(url: string): Promise<{ blob: Blob; fileName: string | null }> {
  await ensureCsrfToken()
  const response = await fetch(url, { credentials: 'include' })
  if (response.status === 401) {
    clearCsrfToken()
    const message = await parseError(response)
    onUnauthorized?.(message || 'Сесію завершено. Увійдіть знову.')
    throw new Error(message || 'Сесію завершено. Увійдіть знову.')
  }
  if (!response.ok) throw new Error(await parseError(response))

  const disposition = response.headers.get('Content-Disposition')
  let fileName: string | null = null
  if (disposition) {
    const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
    const plainMatch = /filename="?([^";]+)"?/i.exec(disposition)
    if (utfMatch?.[1]) fileName = decodeURIComponent(utfMatch[1])
    else if (plainMatch?.[1]) fileName = plainMatch[1]
  }

  return { blob: await response.blob(), fileName }
}

/** Login does not require CSRF header (exempt on server). */
export async function apiLogin<T>(url: string, body: unknown): Promise<T> {
  await ensureCsrfToken()
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(await parseError(response))
  return response.json() as Promise<T>
}
