'use client'

/**
 * @deprecated Prefer `useToast()` from ToastProvider. Kept so existing pages compile
 * while migrating; renders nothing — toasts go through the global provider.
 */
export function Toast(props: { message: string | null; tone?: 'success' | 'warning' | 'error' }) {
  void props
  return null
}
