import { NextResponse } from 'next/server'
import { getOmApiBase } from './omBase'
import {
  clearAuthCookies,
  readAccessToken,
  readRefreshToken,
  setAccessCookie,
} from './sessionCookies'

type ProxyInit = {
  method: string
  path: string
  search?: string
  body?: BodyInit | null
  contentType?: string | null
  auth?: boolean
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await readRefreshToken()
  if (!refreshToken) return null
  const res = await fetch(`${getOmApiBase()}/api/auth/session/refresh`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  })
  if (!res.ok) {
    await clearAuthCookies()
    return null
  }
  const data = (await res.json().catch(() => null)) as { accessToken?: string; token?: string } | null
  const token = data?.accessToken || data?.token
  if (!token) {
    await clearAuthCookies()
    return null
  }
  await setAccessCookie(token)
  return token
}

export async function proxyToOm(init: ProxyInit): Promise<NextResponse> {
  const doFetch = async (accessToken: string | null, retried: boolean): Promise<NextResponse> => {
    const headers = new Headers()
    headers.set('Accept', 'application/json')
    headers.set('Accept-Language', 'pl')
    headers.set('Cookie', 'locale=pl')
    if (init.contentType) headers.set('Content-Type', init.contentType)
    if (init.auth !== false && accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }

    const url = `${getOmApiBase()}/api/${init.path.replace(/^\//, '')}${init.search || ''}`
    const res = await fetch(url, {
      method: init.method,
      headers,
      body: init.body ?? undefined,
      cache: 'no-store',
    })

    if (res.status === 401 && init.auth !== false && !retried) {
      const next = await refreshAccessToken()
      if (next) return doFetch(next, true)
    }

    const responseHeaders = new Headers()
    const contentType = res.headers.get('content-type')
    if (contentType) responseHeaders.set('content-type', contentType)

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    })
  }

  const access = init.auth === false ? null : await readAccessToken()
  return doFetch(access, false)
}
