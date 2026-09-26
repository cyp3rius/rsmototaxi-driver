import { Phone } from 'lucide-react'

const COORDINATOR_TEL = '+48508222321'
const COORDINATOR_DISPLAY = '508 222 321'

/** Footer under weekly/monthly settlement breakdown. */
export function SettlementContactNote() {
  return (
    <div className="mt-3 px-1 text-[15px] leading-5 text-[var(--text-secondary)]">
      <p>Rozliczenie akceptuje flota.</p>
      <p className="mt-0.5">
        Pytania o kwoty: koordynator{' '}
        <a
          href={`tel:${COORDINATOR_TEL}`}
          className="inline font-semibold no-underline"
          style={{ color: 'var(--accent)', WebkitTextFillColor: 'var(--accent)' }}
        >
          <Phone
            size={14}
            strokeWidth={2.4}
            aria-hidden
            className="relative top-[0.125em] mr-1 inline-block"
            style={{ color: 'var(--accent)' }}
          />
          {COORDINATOR_DISPLAY}
        </a>
      </p>
    </div>
  )
}
