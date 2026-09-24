export const DEFAULT_PER_PAGE = 20
export const MAX_PER_PAGE = 50

export interface PageMeta {
  page: number
  perPage: number
  total: number
  pages: number
}

/** Clamp untrusted page input: page >= 1 (integer), perPage within 1..MAX_PER_PAGE. */
export function pageParams(
  input: { page?: unknown; perPage?: unknown } = {},
  defaultPerPage = DEFAULT_PER_PAGE
) {
  const toInt = (value: unknown, fallback: number) => {
    const n = Number(value)
    return Number.isInteger(n) && n > 0 ? n : fallback
  }
  return {
    page: toInt(input.page, 1),
    perPage: Math.min(toInt(input.perPage, defaultPerPage), MAX_PER_PAGE),
  }
}

export function pageMeta(total: number, page: number, perPage: number): PageMeta {
  return { page, perPage, total, pages: Math.max(1, Math.ceil(total / perPage)) }
}

export interface Paged<T> {
  rows: T[]
  meta: PageMeta
}
