export const ADMIN_ROLE = 'admin'
export const DEFAULT_ROLE = 'user'

/** Better Auth joins several roles with a comma, so equality would lock out an "admin,user" row. */
export function isAdminRole(role: string | null | undefined): boolean {
  return role !== null && role !== undefined && role.split(',').some((entry) => entry.trim() === ADMIN_ROLE)
}
