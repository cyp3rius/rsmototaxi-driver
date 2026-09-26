import { WowLoadingScreen } from '@/components/screens/WowLoadingScreen'

/** 5.3–5.4 follows the active theme (light/dark). Splash stays brand-black until this paints. */
export default function LoadingPage() {
  return (
    <div className="min-h-dvh bg-[var(--bg-base)]">
      <WowLoadingScreen />
    </div>
  )
}
