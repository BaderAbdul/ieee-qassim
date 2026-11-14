'use client';

import { apiGet, apiSend } from './backend';

/** True when the site runs as the installed app (its own window), not as a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export const isIos = () => typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

// --- "Install the app": the browser offers its install prompt once; keep it so any screen can use it ----------------------
interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); deferred = event as InstallEvent; listeners.forEach(fn => fn()); });
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach(fn => fn()); });
}
export const installAvailable = () => deferred !== null;
export function onInstallChange(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  const event = deferred;
  await event.prompt();
  const { outcome } = await event.userChoice;
  deferred = null; listeners.forEach(fn => fn());
  return outcome;
}

// --- Push notifications -----------------------------------------------------------------------------------------------------
export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = (base64Url + '='.repeat((4 - base64Url.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

async function readyRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('The service worker is not ready yet. Reload the page and try again. / الخدمة غير جاهزة بعد؛ أعد تحميل الصفحة وحاول مجددًا.')), 8000)),
  ]);
  return registration;
}

/** Asks for permission, subscribes this device and tells the server (and whether it is the installed app). */
export async function enableNotifications(): Promise<void> {
  if (!pushSupported()) throw new Error('This browser cannot receive notifications. / هذا المتصفح لا يدعم الإشعارات.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in the browser settings. / الإشعارات محظورة؛ اسمح بها من إعدادات المتصفح.');
  const registration = await readyRegistration();
  const { publicKey } = await apiGet<{ publicKey: string }>('/api/me/push/key');
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const current = subscription.options.applicationServerKey;
    const same = current && btoa(String.fromCharCode(...new Uint8Array(current))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') === publicKey;
    if (!same) { await subscription.unsubscribe(); subscription = null; }
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  await apiSend('POST', '/api/me/push/subscribe', { subscription: subscription.toJSON(), standalone: isStandalone() });
}

/** Re-reports this device (e.g. when the installed app opens) so the server knows the app is installed. Silent on failure. */
export async function refreshDevice(): Promise<void> {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return;
    const subscription = await (await readyRegistration()).pushManager.getSubscription();
    if (subscription) await apiSend('POST', '/api/me/push/subscribe', { subscription: subscription.toJSON(), standalone: isStandalone() });
  } catch { /* optional */ }
}
