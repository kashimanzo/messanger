import { Capacitor } from '@capacitor/core';

function normalizeApiBaseUrl(url: string) {
  const trimmed = url.trim().replace(/\/$/, '');

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Railway and most hosted APIs require HTTPS
  return `https://${trimmed}`;
}

/**
 * Resolves the API base URL for the mobile app.
 *
 * - In Vite browser/web on localhost, use same-origin so `/api` hits the Vite proxy.
 * - When VITE_API_URL is set on native (or non-local hosts), use it everywhere.
 * - Otherwise fall back to platform defaults.
 */
export function getApiBaseUrl(): string {
  const isBrowserDev =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    !Capacitor.isNativePlatform() &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  if (isBrowserDev) {
    return window.location.origin;
  }

  const configured = import.meta.env.VITE_API_URL?.trim();

  if (configured) {
    return normalizeApiBaseUrl(configured);
  }

  if (typeof window !== 'undefined') {
    const { protocol, origin } = window.location;

    if (protocol === 'http:' || protocol === 'https:') {
      return origin;
    }
  }

  // Emulator-only fallbacks — never used in production APK/IPA builds
  // (those must set VITE_API_URL to a public HTTPS API).
  if (import.meta.env.DEV && Capacitor.getPlatform() === 'android') {
    return 'http://10.0.2.2:3000';
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }

  throw new Error(
    'VITE_API_URL is missing. Set it to your public API URL before building the app.',
  );
}
