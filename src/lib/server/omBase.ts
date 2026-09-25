export function getOmApiBase(): string {
  const base = (process.env.OM_API_BASE || process.env.NEXT_PUBLIC_OM_API_BASE || '').replace(/\/$/, '')
  if (!base) {
    throw new Error('OM_API_BASE (or NEXT_PUBLIC_OM_API_BASE) is not set')
  }
  return base
}

export function rememberMeDays(): number {
  const days = Number(process.env.REMEMBER_ME_DAYS || '30')
  return Number.isFinite(days) && days > 0 ? days : 30
}
