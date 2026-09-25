'use client'

import Link from 'next/link'
import { ArrowUpDown, Ellipsis, Fuel, ParkingSquare, Plus, Trash2, Wrench } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { Toast } from '@/components/ui/Toast'
import { omClient } from '@/lib/om/client'
import { formatDate, formatMoney } from '@/lib/format'
import { costTypeLabel } from '@/lib/tripMeta'

const icons: Record<string, typeof Fuel> = {
  fuel: Fuel,
  toll: ArrowUpDown,
  parking: ParkingSquare,
  maintenance: Wrench,
  other: Ellipsis,
}

type SortMode = 'date_desc' | 'amount_desc' | 'amount_asc'

export default function ExpensesPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [sort, setSort] = useState<SortMode>('date_desc')

  async function reload() {
    const res = await omClient.getExpenses({ pageSize: 50 })
    const payload = res as { items?: Record<string, unknown>[] }
    setItems(payload.items || (Array.isArray(res) ? (res as Record<string, unknown>[]) : []))
  }

  useEffect(() => {
    queueMicrotask(() => {
      void reload().finally(() => setLoading(false))
    })
  }, [])

  const sortedItems = useMemo(() => {
    const next = [...items]
    next.sort((a, b) => {
      if (sort === 'amount_desc') return (Number(b.amountGross) || 0) - (Number(a.amountGross) || 0)
      if (sort === 'amount_asc') return (Number(a.amountGross) || 0) - (Number(b.amountGross) || 0)
      const ta = new Date(String(a.occurredAt || a.createdAt || 0)).getTime()
      const tb = new Date(String(b.occurredAt || b.createdAt || 0)).getTime()
      return tb - ta
    })
    return next
  }, [items, sort])

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.amountGross) || 0), 0),
    [items],
  )

  const deleting = items.find((item) => String(item.id) === deleteId)

  async function confirmDelete() {
    if (!deleteId || busy) return
    setBusy(true)
    try {
      await omClient.deleteExpense(deleteId)
      setDeleteId(null)
      await reload()
      setToast('Koszt usunięty')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Nie udało się usunąć')
    } finally {
      setBusy(false)
      window.setTimeout(() => setToast(null), 3000)
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Koszty"
        action={
          <Link
            href="/app/expenses/new"
            className="inline-flex h-12 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-[16px] font-semibold text-[var(--accent-on)]"
          >
            <Plus size={18} strokeWidth={2.4} />
            Koszt
          </Link>
        }
      />
      <PullToRefresh
        onRefresh={async () => {
          setLoading(true)
          try {
            await reload()
          } finally {
            setLoading(false)
          }
        }}
      >
      <div className="px-5 pb-28">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] text-[var(--text-secondary)]">
            {items.length} kosztów ·{' '}
            <b className="font-semibold text-[var(--text-primary)]">{formatMoney(total)}</b>
          </p>
          <button
            type="button"
            onClick={() =>
              setSort((s) =>
                s === 'date_desc' ? 'amount_desc' : s === 'amount_desc' ? 'amount_asc' : 'date_desc',
              )
            }
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--separator)] px-3 text-[15px] font-medium"
          >
            <ArrowUpDown size={16} strokeWidth={2} />
            {sort === 'date_desc' ? 'Data' : sort === 'amount_desc' ? 'Kwota ↓' : 'Kwota ↑'}
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-[var(--text-secondary)]">Ładowanie…</p>
        ) : items.length === 0 ? (
          <p className="mt-6 text-[var(--text-secondary)]">Brak kosztów.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sortedItems.map((item) => {
              const type = String(item.costType || item.type || 'other')
              const Icon = icons[type] || Ellipsis
              const hasReceipt = Boolean(item.receiptAttachmentId)
              return (
                <li key={String(item.id)}>
                  <SurfaceCard className="flex gap-3">
                    <span className="flex size-11 flex-none items-center justify-center rounded-[14px] bg-[var(--bg-surface-raised)]">
                      <Icon size={22} className="text-[var(--text-secondary)]" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2.5">
                        <span className="text-[17px] font-semibold">{costTypeLabel(type)}</span>
                        <span className="text-[17px] font-semibold tabular-nums">
                          {formatMoney(item.amountGross)}
                        </span>
                      </span>
                      <span className="mt-1 block text-[15px] text-[var(--text-secondary)]">
                        {formatDate(String(item.occurredAt || item.createdAt || ''))}
                        {item.vatRate != null ? ` · VAT ${item.vatRate}%` : ''}
                      </span>
                      <span className="mt-2 flex items-center justify-between gap-2">
                        <span
                          className={
                            hasReceipt
                              ? 'inline-flex h-[30px] items-center rounded-[10px] bg-[var(--bg-surface-raised)] px-2.5 text-[15px] font-medium text-[var(--text-secondary)]'
                              : 'inline-flex h-[30px] items-center rounded-[10px] tint-warning px-2.5 text-[15px] font-medium text-[var(--warning)]'
                          }
                        >
                          {hasReceipt ? 'Paragon' : 'Brak paragonu'}
                        </span>
                        <button
                          type="button"
                          className="flex size-10 items-center justify-center rounded-full text-[var(--danger)]"
                          aria-label="Usuń koszt"
                          onClick={() => setDeleteId(String(item.id))}
                        >
                          <Trash2 size={18} strokeWidth={1.9} />
                        </button>
                      </span>
                    </span>
                  </SurfaceCard>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      </PullToRefresh>

      <BottomSheet
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Usunąć ten koszt?"
        subtitle={
          deleting
            ? `${costTypeLabel(deleting.costType || deleting.type)} · ${formatMoney(deleting.amountGross)}`
            : undefined
        }
      >
        <div className="space-y-2">
          <Button variant="danger" size="md" loading={busy} onClick={() => void confirmDelete()}>
            Usuń koszt
          </Button>
          <Button variant="secondary" size="md" onClick={() => setDeleteId(null)}>
            Anuluj
          </Button>
        </div>
      </BottomSheet>
      <Toast message={toast} />
    </AppShell>
  )
}
