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

export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(await parseError(response))
  return response.json() as Promise<T>
}

export async function apiSend<T>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T | void> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) throw new Error(await parseError(response))
  if (response.status === 204) return

  const text = await response.text()
  if (!text) return
  return JSON.parse(text) as T
}

export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  const response = await fetch(url, { method: 'POST', body: formData })
  if (!response.ok) throw new Error(await parseError(response))
  return response.json() as Promise<T>
}
