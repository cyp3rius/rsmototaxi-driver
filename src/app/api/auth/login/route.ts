import { NextResponse } from 'next/server'
import { getOmApiBase } from '@/lib/server/omBase'
import { setAuthCookies } from '@/lib/server/sessionCookies'

export async function POST(req: Request) {
  let body: { email?: string; password?: string; tenantId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
  }

  const email = String(body.email || '').trim()
  const password = String(body.password || '')
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 400 })
  }

  const upstream = await fetch(`${getOmApiBase()}/api/taxi_fleet/driver-app/v2/auth/login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      ...(body.tenantId ? { tenantId: body.tenantId } : {}),
    }),
    cache: 'no-store',
  })

  const data = (await upstream.json().catch(() => null)) as {
    ok?: boolean
    token?: string
    refreshToken?: string
    member?: { email?: string; displayName?: string | null }
    error?: string
  } | null

  if (!upstream.ok || !data?.ok || !data.token || !data.refreshToken) {
    return NextResponse.json(
      { ok: false, error: data?.error || 'Login failed' },
      { status: upstream.status || 401 },
    )
  }

  await setAuthCookies({
    accessToken: data.token,
    refreshToken: data.refreshToken,
    profile: {
      email: data.member?.email ?? email,
      displayName: data.member?.displayName ?? null,
    },
  })

  return NextResponse.json({
    ok: true,
    member: {
      email: data.member?.email ?? email,
      displayName: data.member?.displayName ?? null,
    },
  })
}
