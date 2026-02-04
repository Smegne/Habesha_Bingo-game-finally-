'use client'

// Initialize Telegram WebApp and handle authentication
export function initTelegramWebApp() {
  if (typeof window === 'undefined') return null;
  
  // Check if we're in Telegram WebApp
  const isTelegramWebApp = !!(window as any).Telegram?.WebApp;
  
  if (!isTelegramWebApp) return null;
  
  const tg = (window as any).Telegram.WebApp;
  
  // Initialize Telegram WebApp
  tg.ready();
  tg.expand();
  
  // Get initData from Telegram
  const initData = tg.initData;
  const user = tg.initDataUnsafe?.user;
  
  return {
    isTelegramWebApp: true,
    initData,
    user,
    tg,
    platform: tg.platform,
    version: tg.version,
    themeParams: tg.themeParams,
  };
}

// Extract initData from URL (fallback method)
export function getInitDataFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tgWebAppData') || urlParams.get('initData') || null;
}

// Check if we should auto-login
export function shouldAutoLogin(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if we have initData from Telegram
  const isTelegram = !!(window as any).Telegram?.WebApp?.initData;
  
  // Check if we have initData in URL
  const urlHasInitData = !!getInitDataFromURL();
  
  // Check if we have a start param
  const urlParams = new URLSearchParams(window.location.search);
  const hasStartParam = urlParams.has('tgWebAppStartParam');
  
  return isTelegram || urlHasInitData || hasStartParam;
}