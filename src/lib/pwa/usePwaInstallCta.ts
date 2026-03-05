import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { captureEvent } from '../analytics/analytics'

type InstallPlatform = 'ios' | 'android' | 'desktop' | 'unsupported'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'pwa_install_cta_dismissed_until'
const INSTALLED_KEY = 'pwa_install_completed'
const DEFAULT_DISMISS_DAYS = 14

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  const mediaStandalone = window.matchMedia('(display-mode: standalone)').matches
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return mediaStandalone || navigatorStandalone || document.referrer.startsWith('android-app://')
}

function detectPlatform(): InstallPlatform {
  if (typeof window === 'undefined') return 'unsupported'
  const ua = window.navigator.userAgent.toLowerCase()
  const touchMac = /macintosh/.test(ua) && 'ontouchend' in document
  const isIos = /iphone|ipad|ipod/.test(ua) || touchMac
  if (isIos) return 'ios'
  if (/android/.test(ua)) return 'android'
  if (/windows|macintosh|linux|cros/.test(ua)) return 'desktop'
  return 'unsupported'
}

function getDismissedUntil(): number {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(DISMISS_KEY)
  const parsed = raw ? Number(raw) : 0
  return Number.isFinite(parsed) ? parsed : 0
}

function getInstalledMemory(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(INSTALLED_KEY) === 'true'
}

export function usePwaInstallCta() {
  const platform = useMemo(detectPlatform, [])
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState<boolean>(() => isStandaloneMode() || getInstalledMemory())
  const [dismissedUntil, setDismissedUntil] = useState<number>(() => getDismissedUntil())
  const [showIosSheet, setShowIosSheet] = useState(false)
  const hasTrackedShownRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent
      installEvent.preventDefault()
      setDeferredPrompt(installEvent)
    }

    const onAppInstalled = () => {
      setInstalled(true)
      window.localStorage.setItem(INSTALLED_KEY, 'true')
      setDeferredPrompt(null)
      captureEvent('install_completed', { source: 'appinstalled_event' })
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    const displayModeQuery = window.matchMedia('(display-mode: standalone)')
    const onDisplayModeChange = () => {
      if (isStandaloneMode()) {
        setInstalled(true)
        window.localStorage.setItem(INSTALLED_KEY, 'true')
      }
    }
    displayModeQuery.addEventListener('change', onDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
      displayModeQuery.removeEventListener('change', onDisplayModeChange)
    }
  }, [])

  const dismissForDays = useCallback((days = DEFAULT_DISMISS_DAYS) => {
    if (typeof window === 'undefined') return
    const until = Date.now() + days * 24 * 60 * 60 * 1000
    window.localStorage.setItem(DISMISS_KEY, String(until))
    setDismissedUntil(until)
    setShowIosSheet(false)
    captureEvent('install_cta_dismissed', { days })
  }, [])

  const openIosInstructions = useCallback(() => {
    setShowIosSheet(true)
  }, [])

  const closeIosInstructions = useCallback(() => {
    setShowIosSheet(false)
  }, [])

  const triggerInstall = useCallback(async () => {
    captureEvent('install_cta_clicked', { platform })

    if (platform === 'ios') {
      setShowIosSheet(true)
      return
    }

    if (!deferredPrompt) return

    captureEvent('install_prompt_triggered', { platform })
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice

    if (choice.outcome === 'accepted') {
      setInstalled(true)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(INSTALLED_KEY, 'true')
      }
      captureEvent('install_completed', { source: 'beforeinstallprompt', platform: choice.platform })
    } else {
      dismissForDays()
    }

    setDeferredPrompt(null)
  }, [deferredPrompt, dismissForDays, platform])

  const isDismissed = dismissedUntil > Date.now()
  const canShow = useMemo(() => {
    if (installed || isStandaloneMode()) return false
    if (isDismissed) return false
    if (platform === 'ios') return true
    return Boolean(deferredPrompt)
  }, [deferredPrompt, installed, isDismissed, platform])

  useEffect(() => {
    if (!canShow || hasTrackedShownRef.current) return
    captureEvent('install_cta_shown', { platform })
    hasTrackedShownRef.current = true
  }, [canShow, platform])

  const ctaLabel = platform === 'ios' ? 'Add to Home Screen' : 'Install App'
  const ctaIcon = platform === 'ios' ? 'ios_share' : platform === 'android' ? 'android' : 'download'

  return {
    platform,
    canShow,
    installed,
    ctaLabel,
    ctaIcon,
    triggerInstall,
    showIosSheet,
    openIosInstructions,
    closeIosInstructions,
    dismissForDays,
  }
}
