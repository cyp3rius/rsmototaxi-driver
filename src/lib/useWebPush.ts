'use client'

import { useCallback, useEffect, useState } from 'react'
import { omClient } from '@/lib/om/client'

export type PushStatus = 'ready' | 'prompt' | 'denied' | 'unsupported' | 'unavailable'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

function supportsPush() {
  if (typeof window === 'undefined') return false
  if (!window.isSecureContext) return false
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function initialPushStatus(): PushStatus {
  if (typeof window === 'undefined') return 'unavailable'
  if (!supportsPush()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'granted') return 'ready'
  return 'prompt'
}

export function useWebPush() {
  const [status, setStatus] = useState<PushStatus>(initialPushStatus)
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    if (!supportsPush()) return
    void omClient
      .getPushSubscription()
      .then((res) => {
        const payload = res as { configured?: boolean; vapidPublicKey?: string | null }
        setConfigured(Boolean(payload.configured && payload.vapidPublicKey))
      })
      .catch(() => setConfigured(false))
  }, [])

  const requestAccess = useCallback(async (): Promise<PushStatus> => {
    if (!supportsPush()) return 'unsupported'
    try {
      const info = (await omClient.getPushSubscription()) as {
        configured?: boolean
        vapidPublicKey?: string | null
      }
      if (!info.configured || !info.vapidPublicKey) {
        setConfigured(false)
        return 'unavailable'
      }
      setConfigured(true)
      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        setStatus('denied')
        return 'denied'
      }
      if (permission !== 'granted') {
        setStatus('prompt')
        return 'prompt'
      }
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(info.vapidPublicKey) as BufferSource,
      })
      const json = subscription.toJSON()
      await omClient.savePushSubscription({
        endpoint: json.endpoint,
        expirationTime: json.expirationTime ?? null,
        keys: {
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        },
      })
      setStatus('ready')
      return 'ready'
    } catch {
      setStatus('unavailable')
      return 'unavailable'
    }
  }, [])

  return { status, configured, requestAccess, showConsentBanner: status === 'prompt' && configured }
}
