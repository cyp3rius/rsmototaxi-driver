'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Legacy /login → welcome with login sheet open (same hero, design 5.2). */
export default function LoginPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/?login=1')
  }, [router])
  return <div className="min-h-dvh bg-[#020407]" />
}
