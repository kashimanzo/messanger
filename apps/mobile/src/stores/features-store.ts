import { create } from 'zustand';

export type MessagingFeatures = {
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  channels: Array<'WHATSAPP' | 'SMS'>;
  defaultChannel: 'WHATSAPP' | 'SMS' | null;
  clickSendFrom: string | null;
};

type FeaturesState = {
  features: MessagingFeatures | null;
  setFeatures: (features: MessagingFeatures) => void;
  reset: () => void;
};

export const useFeaturesStore = create<FeaturesState>((set) => ({
  features: null,
  setFeatures: (features) => set({ features }),
  reset: () => set({ features: null }),
}));
