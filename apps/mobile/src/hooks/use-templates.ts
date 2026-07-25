import { useCallback, useEffect } from 'react';
import { getErrorMessage } from '../lib/get-error-message';
import { trpc } from '../lib/trpc';
import { useTemplatesStore } from '../stores/templates-store';

export function useTemplates(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const utils = trpc.useUtils();
  const templates = useTemplatesStore((state) => state.templates);
  const isLoading = useTemplatesStore((state) => state.isLoading);
  const error = useTemplatesStore((state) => state.error);
  const hasFetched = useTemplatesStore((state) => state.hasFetched);
  const setTemplates = useTemplatesStore((state) => state.setTemplates);
  const setLoading = useTemplatesStore((state) => state.setLoading);
  const setError = useTemplatesStore((state) => state.setError);
  const setHasFetched = useTemplatesStore((state) => state.setHasFetched);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return useTemplatesStore.getState().templates;
    }

    if (useTemplatesStore.getState().isLoading) {
      return useTemplatesStore.getState().templates;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await utils.client.listWhatsAppTemplates.query();
      setTemplates(data);
      setHasFetched(true);
      return data;
    } catch (fetchError) {
      const message = getErrorMessage(fetchError, 'Failed to load templates');
      setError(message);
      throw fetchError;
    } finally {
      setLoading(false);
    }
  }, [
    enabled,
    setError,
    setHasFetched,
    setLoading,
    setTemplates,
    utils.client.listWhatsAppTemplates,
  ]);

  useEffect(() => {
    if (!enabled || hasFetched) {
      return;
    }

    void refresh();
  }, [enabled, hasFetched, refresh]);

  return {
    templates: enabled ? templates : [],
    isLoading: enabled && isLoading && !hasFetched,
    isRefreshing: enabled && isLoading && hasFetched,
    error: enabled ? error : null,
    hasFetched,
    refresh,
  };
}
