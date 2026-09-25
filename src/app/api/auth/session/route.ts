import { NextResponse } from 'next/server'
import { readAccessToken, readProfileCookie, readRefreshToken } from '@/lib/server/sessionCookies'

export async function GET() {
  const access = await readAccessToken()
  const refresh = await readRefreshToken()
  if (!access && !refresh) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 })
  }

  const profile = await readProfileCookie()
  return NextResponse.json({
    ok: true,
    authenticated: true,
    member: profile ?? null,
  })
}
