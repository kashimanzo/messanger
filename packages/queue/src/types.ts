import type { TemplateSendOptions } from '@bulk-messanger/whatsapp';

export type MessagingChannel = 'WHATSAPP' | 'SMS';

export type WhatsAppQueueJobData = {
  campaignMessageId: string;
  campaignId: string;
  userId: string;
  phoneNumber: string;
  channel: MessagingChannel;
  type: 'TEMPLATE' | 'TEXT';
  template?: TemplateSendOptions;
  textBody?: string;
  /** Optional ClickSend sender override for SMS channel. */
  from?: string;
};

export type CampaignRecipient = {
  phoneNumber: string;
  contactName?: string;
};

export type EnqueueTemplateCampaignInput = {
  userId: string;
  templateName: string;
  language: string;
  variables?: TemplateSendOptions['variables'];
  groupId?: string;
  groupName?: string;
  recipients: CampaignRecipient[];
};

export type EnqueueTextCampaignInput = {
  userId: string;
  textBody: string;
  channel?: MessagingChannel;
  /** Optional ClickSend sender override for SMS channel. */
  from?: string;
  recipients: CampaignRecipient[];
};
