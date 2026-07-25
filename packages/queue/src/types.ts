export type MessagingChannel = 'SMS';

export type WhatsAppQueueJobData = {
  campaignMessageId: string;
  campaignId: string;
  userId: string;
  phoneNumber: string;
  channel: MessagingChannel;
  type: 'TEXT';
  textBody?: string;
  /** Optional ClickSend sender override. */
  from?: string;
};

export type CampaignRecipient = {
  phoneNumber: string;
  contactName?: string;
};

export type EnqueueTextCampaignInput = {
  userId: string;
  textBody: string;
  channel?: MessagingChannel;
  /** Optional ClickSend sender override. */
  from?: string;
  recipients: CampaignRecipient[];
};
