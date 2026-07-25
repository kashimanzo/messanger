import { useEffect, useMemo } from 'react';
import { trpc } from '../lib/trpc';
import { useFeaturesStore } from '../stores/features-store';

function parseBool(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function hasExplicitViteSmsFlag() {
  const value = import.meta.env.VITE_FEATURE_SMS_ENABLED;
  return value !== undefined && String(value).trim() !== '';
}

/**
 * Build-time mobile feature mode from apps/mobile/.env.
 * Used when VITE_FEATURE_SMS_ENABLED is set so the native app is not overridden
 * by a Railway API that still has FEATURE_SMS_ENABLED unset/false.
 */
function getViteFeatureFallback() {
  const smsEnabled = parseBool(
    import.meta.env.VITE_FEATURE_SMS_ENABLED,
    parseBool(import.meta.env.FEATURE_SMS_ENABLED, false),
  );
  const whatsappEnabled = !smsEnabled;
  const channels: Array<'WHATSAPP' | 'SMS'> = smsEnabled
    ? ['SMS']
    : ['WHATSAPP'];

  return {
    whatsappEnabled,
    smsEnabled,
    channels,
    defaultChannel: (channels[0] ?? null) as 'WHATSAPP' | 'SMS' | null,
    clickSendFrom:
      (import.meta.env.VITE_CLICKSEND_FROM as string | undefined)?.trim() ||
      null,
  };
}

export function useMessagingFeatures() {
  const features = useFeaturesStore((state) => state.features);
  const setFeatures = useFeaturesStore((state) => state.setFeatures);
  const preferVite = hasExplicitViteSmsFlag();
  const viteFallback = useMemo(() => getViteFeatureFallback(), []);

  const query = trpc.getMessagingFeatures.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }

    if (preferVite) {
      setFeatures({
        ...viteFallback,
        // Keep server sender when API is also in SMS mode; otherwise Vite value.
        clickSendFrom:
          query.data.smsEnabled && query.data.clickSendFrom
            ? query.data.clickSendFrom
            : viteFallback.clickSendFrom,
      });
      return;
    }

    setFeatures(query.data);
  }, [preferVite, query.data, setFeatures, viteFallback]);

  const resolved =
    features ??
    (preferVite
      ? viteFallback
      : query.data ?? (query.isError ? viteFallback : null));

  return {
    whatsappEnabled: resolved?.whatsappEnabled ?? false,
    smsEnabled: resolved?.smsEnabled ?? false,
    channels: resolved?.channels ?? [],
    defaultChannel: resolved?.defaultChannel ?? null,
    clickSendFrom: resolved?.clickSendFrom ?? null,
    isLoading: query.isLoading && !resolved,
    isReady: Boolean(resolved),
    error: query.error,
    refetch: query.refetch,
  };
}
