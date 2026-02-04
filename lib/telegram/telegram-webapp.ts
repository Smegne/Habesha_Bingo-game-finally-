'use client'

// Check if running in browser
export const isClient = typeof window !== 'undefined'

// Enhanced Telegram WebApp detection
export function isTelegramWebApp(): boolean {
  if (!isClient) return false;
  
  // Check for Telegram WebApp
  if ((window as any).Telegram?.WebApp) {
    return true;
  }
  
  // Check for initData in URL (fallback for testing)
  const urlParams = new URLSearchParams(window.location.search);
  const hasInitData = urlParams.has('tgWebAppData') || urlParams.has('initData');
  const hasStartParam = urlParams.has('tgWebAppStartParam');
  
  return hasInitData || hasStartParam;
}

export function getTelegramInitData(): string {
  if (!isClient) return '';
  
  // First try to get from Telegram WebApp
  if ((window as any).Telegram?.WebApp?.initData) {
    return (window as any).Telegram.WebApp.initData;
  }
  
  // Fallback: get from URL
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tgWebAppData') || urlParams.get('initData') || '';
}

export function getTelegramUser(): any {
  if (!isClient) return null;
  
  // First try to get from Telegram WebApp
  if ((window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
    return (window as any).Telegram.WebApp.initDataUnsafe.user;
  }
  
  // Fallback: try to parse from URL
  const initData = getTelegramInitData();
  if (!initData) return null;
  
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

export function initializeTelegramWebApp(): boolean {
  if (!isClient) return false;
  
  if ((window as any).Telegram?.WebApp) {
    const tg = (window as any).Telegram.WebApp;
    tg.ready();
    tg.expand();
    return true;
  }
  
  return false;
}

// Check if Mini App was opened from Telegram Bot
export function isOpenedFromTelegramBot(): boolean {
  if (!isClient) return false;
  
  // Check actual Telegram WebApp
  if ((window as any).Telegram?.WebApp?.initData) {
    return true;
  }
  
  // Check URL for Telegram markers
  const urlParams = new URLSearchParams(window.location.search);
  const hasTelegramMarker = urlParams.has('tgWebAppStartParam') || 
                           urlParams.has('tgWebAppData') || 
                           urlParams.has('initData') ||
                           window.location.hash.includes('tgWebApp');
  
  return hasTelegramMarker;
}

// Get auth source: 'telegram' or 'web'
export function getAuthSource(): 'telegram' | 'web' {
  return isOpenedFromTelegramBot() ? 'telegram' : 'web';
}

// Get Telegram WebApp instance
export function getTelegramInstance(): any {
  if (!isClient) return null;
  return (window as any).Telegram?.WebApp || null;
}