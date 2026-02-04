export const extractTelegramData = (): {
  tgWebAppData?: string
  initData?: string
  platform?: string
  version?: string
} => {
  if (typeof window === "undefined") return {}

  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  const tgWebAppDataFromHash = hashParams.get("tgWebAppData")

  const urlParams = new URLSearchParams(window.location.search)
  const tgWebAppDataFromUrl = urlParams.get("tgWebAppData")

  const tgWebAppData = tgWebAppDataFromHash || tgWebAppDataFromUrl

  const tg = (window as any).Telegram?.WebApp
  const initData = tg?.initData
  const platform = tg?.platform
  const version = tg?.version

  return { tgWebAppData, initData, platform, version }
}