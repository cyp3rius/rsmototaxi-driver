'use client'

import Link from 'next/link'
import { ListFilter, Plus, Trash2 } from 'lucide-react'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { CostTypeIcon } from '@/components/ui/CostTypeIcon'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingBlock } from '@/components/ui/Spinner'
import { StatusChip } from '@/components/ui/StatusChip'
import { SurfaceCard } from '@/components/ui/SurfaceCard'
import { useToast } from '@/components/ui/toast/ToastProvider'
import { omClient } from '@/lib/om/client'
import { formatMoney } from '@/lib/format'
import { useListSearchParams } from '@/lib/useListSearchParams'
import { useRegisterTabRefresh } from '@/lib/transitions/react/TabRefresh'
import {
  costTypeLabel,
  expenseAmountValue,
  expenseMetaLine,
  expenseOcrErrorNote,
  expenseReceiptChip,
} from '@/lib/tripMeta'

type SortMode = 'occurred_desc' | 'occurred_asc' | 'created_desc' | 'created_asc'

const SORT_MODES: SortMode[] = ['occurred_desc', 'occurred_asc', 'created_desc', 'created_asc']

const SORT_LABEL: Record<SortMode, string> = {
  occurred_desc: 'Data dokumentu',
  occurred_asc: 'Data dokumentu',
  created_desc: 'Data dodania',
  created_asc: 'Data dodania',
}

function nextSort(mode: SortMode): SortMode {
  if (mode === 'occurred_desc') return 'occurred_asc'
  if (mode === 'occurred_asc') return 'created_desc'
  if (mode === 'created_desc') return 'created_asc'
  return 'occurred_desc'
}

function parseSort(raw: string | null): SortMode {
  if (raw && (SORT_MODES as string[]).includes(raw)) return raw as SortMode
  return 'occurred_desc'
}

function startOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + diff)
  return d
}

function ExpensesScreenInner() {
  const pathname = usePathname() || ''
  const { get, patch } = useListSearchParams()
  const onList = pathname === '/app/expenses'
  const [sort, setSort] = useState<SortMode>(() => parseSort(get('sort')))
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!onList) return
    setSort(parseSort(get('sort')))
  }, [onList, get])

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

  useRegisterTabRefresh(2, async () => {
    await reload()
  })

  const weekItems = useMemo(() => {
    const from = startOfWeek().getTime()
    return items.filter((item) => {
      const t = new Date(String(item.occurredAt || item.createdAt || 0)).getTime()
      return Number.isFinite(t) && t >= from
    })
  }, [items])

  const sortedItems = useMemo(() => {
    const next = [...items]
    next.sort((a, b) => {
      const field = sort.startsWith('created') ? 'createdAt' : 'occurredAt'
      const ta = new Date(String(a[field] || a.occurredAt || a.createdAt || 0)).getTime()
      const tb = new Date(String(b[field] || b.occurredAt || b.createdAt || 0)).getTime()
      return sort.endsWith('_asc') ? ta - tb : tb - ta
    })
    return next
  }, [items, sort])

  const weekTotal = useMemo(
    () => weekItems.reduce((sum, item) => sum + (expenseAmountValue(item) || 0), 0),
    [weekItems],
  )

  const deleting = items.find((item) => String(item.id) === deleteId)

  async function confirmDelete() {
    if (!deleteId || busy) return
    setBusy(true)
    try {
      await omClient.deleteExpense(deleteId)
      setDeleteId(null)
      await reload()
      toast.success('Koszt usunięty')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się usunąć')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Koszty"
        action={
          <Link
            href="/app/expenses/new"
            className="rs-accent-fill inline-flex h-12 items-center gap-1.5 rounded-full px-4 text-[16px] font-[600]"
          >
            <Plus size={18} strokeWidth={2.4} />
            Koszt
          </Link>
        }
      />
      <div className="px-5 pb-6 pt-1">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-[15px] text-[var(--text-secondary)]">
              Ten tydzień · {weekItems.length} kosztów ·{' '}
              <b className="font-[600] text-[var(--text-primary)]">{formatMoney(weekTotal)}</b>
            </p>
            <button
              type="button"
              onClick={() => {
                const next = nextSort(sort)
                setSort(next)
                if (onList) patch({ sort: next === 'occurred_desc' ? null : next })
              }}
              className="inline-flex h-10 flex-none items-center gap-1.5 rounded-[10px] bg-[var(--bg-surface-raised)] px-3 text-[15px] font-[500]"
            >
              <ListFilter
                size={16}
                strokeWidth={2}
                className={`transition-transform duration-200 ${sort.endsWith('_asc') ? 'rotate-180' : ''}`}
                aria-hidden
              />
              {SORT_LABEL[sort]}
            </button>
          </div>

          {loading && items.length === 0 ? (
            <LoadingBlock className="mt-6" />
          ) : items.length === 0 ? (
            <p className="mt-6 text-[var(--text-secondary)]">Brak kosztów.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {sortedItems.map((item) => {
                const type = String(item.costType || item.type || 'other')
                const amount = expenseAmountValue(item)
                const chip = expenseReceiptChip(item)
                const errorNote = expenseOcrErrorNote(item)
                const meta = expenseMetaLine(item)
                const canDelete = Boolean(item.canDelete)
                return (
                  <li key={String(item.id)}>
                    <SurfaceCard className="flex gap-3">
                      <span className="flex size-11 flex-none items-center justify-center rounded-[14px] bg-[var(--bg-surface-raised)]">
                        <CostTypeIcon type={type} className="text-[var(--text-secondary)]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex justify-between gap-2.5">
                          <span className="text-[17px] font-[600]">{costTypeLabel(type)}</span>
                          <span className="text-[17px] font-[600] tabular-nums">{formatMoney(amount)}</span>
                        </span>
                        {meta ? (
                          <span className="mt-1 block text-[15px] text-[var(--text-secondary)]">{meta}</span>
                        ) : null}
                        <span className="mt-2 flex items-center justify-between gap-2">
                          <StatusChip tone={chip.tone} pulse={chip.pulse}>
                            {chip.label}
                          </StatusChip>
                          {canDelete ? (
                            <button
                              type="button"
                              className="flex size-10 flex-none items-center justify-center rounded-full text-[var(--danger)]"
                              aria-label="Usuń koszt"
                              onClick={() => setDeleteId(String(item.id))}
                            >
                              <Trash2 size={18} strokeWidth={1.9} />
                            </button>
                          ) : null}
                        </span>
                        {errorNote ? (
                          <span className="mt-2 block text-[15px] leading-5 text-[var(--danger)]">
                            {errorNote}
                          </span>
                        ) : null}
                      </span>
                    </SurfaceCard>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      <BottomSheet
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Usunąć ten koszt?"
        subtitle={
          deleting
            ? `${costTypeLabel(deleting.costType || deleting.type)} · ${formatMoney(expenseAmountValue(deleting))}`
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
    </>
  )
}

export function ExpensesScreen() {
  return (
    <Suspense fallback={<LoadingBlock className="px-5 py-16" />}>
      <ExpensesScreenInner />
    </Suspense>
  )
}
