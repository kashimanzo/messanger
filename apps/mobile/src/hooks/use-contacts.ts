import { useCallback, useEffect, useMemo } from 'react';
import { trpc } from '../lib/trpc';
import { useContactsStore } from '../stores/contacts-store';

function filterContacts(
  contacts: ReturnType<typeof useContactsStore.getState>['contacts'],
  search?: string,
) {
  const query = search?.trim().toLowerCase();

  if (!query) {
    return contacts;
  }

  return contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(query) ||
      contact.phoneNumber.includes(query) ||
      contact.email?.toLowerCase().includes(query),
  );
}

export function useContacts(search?: string) {
  const utils = trpc.useUtils();
  const contacts = useContactsStore((state) => state.contacts);
  const isLoading = useContactsStore((state) => state.isLoading);
  const error = useContactsStore((state) => state.error);
  const hasFetched = useContactsStore((state) => state.hasFetched);
  const setContacts = useContactsStore((state) => state.setContacts);
  const setLoading = useContactsStore((state) => state.setLoading);
  const setError = useContactsStore((state) => state.setError);
  const setHasFetched = useContactsStore((state) => state.setHasFetched);

  const refresh = useCallback(async () => {
    if (useContactsStore.getState().isLoading) {
      return useContactsStore.getState().contacts;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await utils.client.listContacts.query();
      setContacts(data);
      setHasFetched(true);
      return data;
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Failed to load contacts';
      setError(message);
      throw fetchError;
    } finally {
      setLoading(false);
    }
  }, [setContacts, setError, setHasFetched, setLoading, utils.client.listContacts]);

  useEffect(() => {
    if (hasFetched) {
      return;
    }

    void refresh();
  }, [hasFetched, refresh]);

  const filteredContacts = useMemo(
    () => filterContacts(contacts, search),
    [contacts, search],
  );

  return {
    contacts: filteredContacts,
    allContacts: contacts,
    isLoading: isLoading && !hasFetched,
    error,
    hasFetched,
    refresh,
  };
}
