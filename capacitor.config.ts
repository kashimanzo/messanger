import type { CapacitorConfig } from '@capacitor/cli';

const liveReload = process.env.CAPACITOR_LIVE_RELOAD === 'true';

const config: CapacitorConfig = {
  appId: 'com.bulkmessanger.app',
  appName: 'Bulk Messanger',
  webDir: 'dist/apps/mobile',
  ios: {
    path: 'apps/mobile/ios',
  },
  android: {
    path: 'apps/mobile/android',
  },
  server: liveReload
    ? {
        url: process.env.CAPACITOR_SERVER_URL ?? 'http://localhost:4300',
        cleartext: true,
      }
    : undefined,
  plugins: {
    CapacitorCookies: {
      enabled: true,
    },
    // Patch fetch/XHR to native HTTP so API errors aren't masked as WebView
    // "Load failed" CORS failures on iOS/Android.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
