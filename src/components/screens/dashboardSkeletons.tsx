import { SkeletonBar } from '@/components/ui/Skeleton'

/** Inline plate / default vehicle under copy (state A). */
export function SkelDefaultPlate() {
  return <SkeletonBar className="mt-1 inline-block h-5 w-[7.5rem]" rounded="md" />
}

/** Occupied vehicle list rows (state A2). */
export function SkelOccupiedVehicles() {
  return (
    <div className="mt-3.5 flex flex-col border-t border-[var(--separator)]">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex h-[52px] items-center justify-between gap-3 border-b border-[var(--separator)] last:border-0"
        >
          <SkeletonBar className="h-5 w-28" />
          <SkeletonBar className="h-4 w-16" rounded="full" />
        </div>
      ))}
    </div>
  )
}

/** Plate + model row under shift card (B / C free). */
export function SkelVehicleRow() {
  return (
    <div className="flex items-center justify-between gap-3">
      <SkeletonBar className="h-8 w-[7.25rem]" rounded="sm" />
      <SkeletonBar className="h-5 w-36" rounded="full" />
    </div>
  )
}

/** Compact shift strip plate slot (C + next trip). */
export function SkelPlateSm() {
  return <SkeletonBar className="h-7 w-[6.5rem]" rounded="sm" />
}

/** „Zaplanowane na dziś” trip card skeleton (state B). */
export function SkelPlannedTripCard() {
  return (
    <div className="rounded-[22px] border border-[var(--separator)] bg-[var(--bg-surface)] p-5">
      <SkeletonBar className="h-4 w-40" />
      <SkeletonBar className="mt-3 h-8 w-28" />
      <div className="mt-4 space-y-2.5">
        <SkeletonBar className="h-4 w-full" />
        <SkeletonBar className="h-4 w-[85%]" />
        <SkeletonBar className="h-4 w-[60%]" />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <SkeletonBar className="h-[30px] w-20" rounded="md" />
        <SkeletonBar className="h-[30px] w-16" rounded="md" />
        <SkeletonBar className="h-[30px] w-24" rounded="md" />
        <SkeletonBar className="h-[30px] w-14" rounded="md" />
      </div>
    </div>
  )
}

/** Next-trip hero skeleton (state C with kurs). */
export function SkelTripHero() {
  return (
    <div className="rounded-[22px] border border-[var(--separator)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-center justify-between gap-3">
        <SkeletonBar className="h-4 w-40" />
        <SkeletonBar className="h-4 w-14" rounded="full" />
      </div>
      <SkeletonBar className="mt-2 h-10 w-24" />
      <div className="mt-3.5 grid grid-cols-[14px_1fr] gap-x-3">
        <span className="flex flex-col items-center pt-1.5">
          <SkeletonBar className="size-2.5" rounded="full" />
          <span className="my-1 w-0.5 flex-1 bg-[var(--separator)]" />
          <SkeletonBar className="size-2.5 rounded-[2px]" />
        </span>
        <span className="flex flex-col gap-3.5">
          <span className="space-y-1.5">
            <SkeletonBar className="h-[17px] w-full" />
            <SkeletonBar className="h-4 w-[70%]" />
          </span>
          <span className="space-y-1.5">
            <SkeletonBar className="h-[17px] w-[80%]" />
            <SkeletonBar className="h-4 w-[50%]" />
          </span>
        </span>
      </div>
      <SkeletonBar className="mt-3.5 h-11 w-full" rounded="lg" />
      <div className="mt-3 flex flex-wrap gap-1.5">
        <SkeletonBar className="h-[30px] w-[5.5rem]" rounded="md" />
        <SkeletonBar className="h-[30px] w-16" rounded="md" />
        <SkeletonBar className="h-[30px] w-24" rounded="md" />
      </div>
    </div>
  )
}

/** Stat value placeholders under labels. */
export function SkelStatValue() {
  return <SkeletonBar className="mt-0.5 h-6 w-14" rounded="md" />
}
