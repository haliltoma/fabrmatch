/** POST JSON with the Inertia XSRF cookie header — for endpoints returning JSON (not redirects). */
export async function postJson<T = unknown>(url: string, body?: unknown): Promise<T> {
  const xsrf = document.cookie
    .split('; ')
    .find((c) => c.startsWith('XSRF-TOKEN='))
    ?.split('=')[1]
    ?.replace(/%3D/g, '=')

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrf ?? '' },
    body: JSON.stringify(body ?? {}),
  })

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: string
      blocked?: boolean
    } | null
    throw Object.assign(new Error(data?.error || `Request failed (${res.status})`), {
      blocked: data?.blocked === true,
    })
  }
  return (await res.json()) as T
}

/** presign → PUT to storage → register: attaches one photo to a dispute. */
export async function uploadDisputeEvidence(disputeId: string, file: File, note?: string) {
  const { storageKey, signedUrl } = await postJson<{ storageKey: string; signedUrl: string }>(
    `/disputes/${disputeId}/evidence/upload-url`,
    { contentType: file.type }
  )
  const put = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!put.ok) throw new Error('Photo upload failed')
  await postJson(`/disputes/${disputeId}/evidence`, { storageKey, note })
}

/** POST multipart form data (file upload) with the XSRF header; expects JSON back. */
export async function postForm<T = unknown>(url: string, form: FormData): Promise<T> {
  const xsrf = document.cookie
    .split('; ')
    .find((c) => c.startsWith('XSRF-TOKEN='))
    ?.split('=')[1]
    ?.replace(/%3D/g, '=')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-XSRF-TOKEN': xsrf ?? '' },
    body: form,
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: string
      blocked?: boolean
    } | null
    throw Object.assign(new Error(data?.error || `Request failed (${res.status})`), {
      blocked: data?.blocked === true,
    })
  }
  return (await res.json()) as T
}
