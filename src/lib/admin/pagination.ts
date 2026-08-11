export const ADMIN_PAGE_SIZE = 25

const WHOLE_NUMBER = /^\d+$/

export function parsePage(value: string | null): number {
  if (value === null || !WHOLE_NUMBER.test(value)) return 1

  const page = Number(value)

  return page >= 1 ? page : 1
}

export function pageOffset(page: number): number {
  return (page - 1) * ADMIN_PAGE_SIZE
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))
}
