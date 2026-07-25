import { useEffect } from 'react';
import { trpc } from '../lib/trpc';
import { useFeaturesStore } from '../stores/features-store';

function parseBool(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

/** Client-side fallback when the API features call fails (stale deploy, offline). */
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
    defaultChannel: channels[0] ?? null,
    clickSendFrom: null as string | null,
  };
}

export function useMessagingFeatures() {
  const features = useFeaturesStore((state) => state.features);
  const setFeatures = useFeaturesStore((state) => state.setFeatures);

  const query = trpc.getMessagingFeatures.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (query.data) {
      setFeatures(query.data);
    }
  }, [query.data, setFeatures]);

  const fallback = getViteFeatureFallback();
  const resolved = features ?? query.data ?? (query.isError ? fallback : null);

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
