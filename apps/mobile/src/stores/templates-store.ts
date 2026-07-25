import { create } from 'zustand';

export type StoredTemplate = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string | null;
  preview: string;
  variables: Array<{
    component: 'body' | 'header';
    index: number;
    label: string;
  }>;
};

type TemplatesState = {
  templates: StoredTemplate[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
  setTemplates: (templates: StoredTemplate[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setHasFetched: (hasFetched: boolean) => void;
  reset: () => void;
};

export const useTemplatesStore = create<TemplatesState>((set) => ({
  templates: [],
  isLoading: false,
  error: null,
  hasFetched: false,
  setTemplates: (templates) => set({ templates }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setHasFetched: (hasFetched) => set({ hasFetched }),
  reset: () =>
    set({
      templates: [],
      isLoading: false,
      error: null,
      hasFetched: false,
    }),
}));
