import { cookies } from 'next/headers'
import { rememberMeDays } from './omBase'

export const ACCESS_COOKIE = 'om_access_token'
export const REFRESH_COOKIE = 'om_refresh_token'
export const PROFILE_COOKIE = 'om_profile'

const ACCESS_MAX_AGE = 60 * 60 * 8

function cookieSecure(): boolean {
  return process.env.NODE_ENV === 'production'
}

export type ProfileCookie = {
  email?: string | null
  displayName?: string | null
}

export async function readAccessToken(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(ACCESS_COOKIE)?.value ?? null
}

export async function readRefreshToken(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(REFRESH_COOKIE)?.value ?? null
}

export async function readProfileCookie(): Promise<ProfileCookie | null> {
  const jar = await cookies()
  const raw = jar.get(PROFILE_COOKIE)?.value
  if (!raw) return null
  try {
    return JSON.parse(decodeURIComponent(raw)) as ProfileCookie
  } catch {
    return null
  }
}

export async function setAuthCookies(params: {
  accessToken: string
  refreshToken: string
  profile?: ProfileCookie
}): Promise<void> {
  const jar = await cookies()
  const secure = cookieSecure()
  jar.set(ACCESS_COOKIE, params.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  })
  jar.set(REFRESH_COOKIE, params.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: rememberMeDays() * 24 * 60 * 60,
  })
  if (params.profile) {
    jar.set(PROFILE_COOKIE, encodeURIComponent(JSON.stringify(params.profile)), {
      httpOnly: false,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: rememberMeDays() * 24 * 60 * 60,
    })
  }
}

export async function setAccessCookie(accessToken: string): Promise<void> {
  const jar = await cookies()
  jar.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  })
}

export async function clearAuthCookies(): Promise<void> {
  const jar = await cookies()
  jar.delete(ACCESS_COOKIE)
  jar.delete(REFRESH_COOKIE)
  jar.delete(PROFILE_COOKIE)
}
