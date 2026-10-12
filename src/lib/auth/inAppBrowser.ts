'use client';

/**
 * Detects whether the current user agent is an embedded in-app browser (WebView)
 * where major OAuth providers (like Google) block sign-in with 403 disallowed_useragent,
 * or where WebKit sessionStorage partitioning causes auth/missing-initial-state.
 */
export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined' || !window.navigator) {
    return false;
  }

  const ua = window.navigator.userAgent || window.navigator.vendor || (window as unknown as { opera?: string }).opera || '';

  // Common in-app browser signatures:
  // WhatsApp, Instagram, Facebook (FBAN/FBAV), Twitter, LinkedIn, Line, Snapchat, TikTok, WeChat, MicroMessenger
  const inAppPatterns = [
    /WhatsApp/i,
    /Instagram/i,
    /FBAN/i,
    /FBAV/i,
    /Twitter/i,
    /Line\//i,
    /Snapchat/i,
    /TikTok/i,
    /MicroMessenger/i,
    /LinkedInApp/i,
    /Pinterest/i,
  ];

  const matchesKnownApp = inAppPatterns.some((pattern) => pattern.test(ua));
  if (matchesKnownApp) return true;

  // iOS WebKit WebView detection (iOS device containing Safari UA tokens or missing version tokens)
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isWebviewIOS = isIOS && !ua.includes('Safari') && ua.includes('WebKit');

  return isWebviewIOS;
}

/**
 * Checks if the user is running on iOS (iPhone, iPad, iPod).
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const ua = window.navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua);
}

/**
 * Checks if the user is running on Android.
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const ua = window.navigator.userAgent || '';
  return /Android/i.test(ua);
}
