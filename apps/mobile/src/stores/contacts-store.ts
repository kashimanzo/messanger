import { create } from 'zustand';

export type StoredContact = {
  id: string;
  name: string;
  phoneNumber: string;
  email: string | null;
  source: 'MANUAL' | 'IMPORTED';
  deviceContactId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ContactsState = {
  contacts: StoredContact[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
  setContacts: (contacts: StoredContact[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setHasFetched: (hasFetched: boolean) => void;
  upsertContact: (contact: StoredContact) => void;
  removeContact: (id: string) => void;
  reset: () => void;
};

export const useContactsStore = create<ContactsState>((set) => ({
  contacts: [],
  isLoading: false,
  error: null,
  hasFetched: false,
  setContacts: (contacts) => set({ contacts }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setHasFetched: (hasFetched) => set({ hasFetched }),
  upsertContact: (contact) =>
    set((state) => {
      const existingIndex = state.contacts.findIndex((entry) => entry.id === contact.id);
      if (existingIndex === -1) {
        return { contacts: [...state.contacts, contact].sort((a, b) => a.name.localeCompare(b.name)) };
      }

      const contacts = [...state.contacts];
      contacts[existingIndex] = contact;
      return { contacts };
    }),
  removeContact: (id) =>
    set((state) => ({
      contacts: state.contacts.filter((contact) => contact.id !== id),
    })),
  reset: () =>
    set({
      contacts: [],
      isLoading: false,
      error: null,
      hasFetched: false,
    }),
}));
