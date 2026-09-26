import { WowLoadingScreen } from '@/components/screens/WowLoadingScreen'

/** Boot wrapper stays brand-black so splash → 5.3–5.4 never flashes theme bg. */
export default function LoadingPage() {
  return (
    <div className="min-h-dvh bg-[#020407]">
      <WowLoadingScreen />
    </div>
  )
}
