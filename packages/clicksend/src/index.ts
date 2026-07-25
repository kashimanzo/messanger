export { getClickSendCredentials } from './credentials';
export { sendSmsMessage } from './client';
export type { SmsSendResult, SmsSendResultWithMeta } from './client';
export type { ClickSendCredentials } from './credentials';

export {
  createContactList,
  addContactToList,
  createListWithContacts,
} from './lists';
export type { ClickSendList, ClickSendContactInput } from './lists';

export {
  sendSmsCampaign,
  calculateSmsCampaignPrice,
  listSmsCampaigns,
  getSmsCampaign,
  cancelSmsCampaign,
} from './campaigns';
export type {
  ClickSendCampaign,
  ClickSendCampaignPrice,
  CampaignPayload,
} from './campaigns';

export { calculateSmsMessagesPrice } from './price';
export type { SmsMessagesPrice } from './price';

export {
  CLICKSEND_NATIVE_CAMPAIGN_MIN_RECIPIENTS,
  CLICKSEND_NATIVE_CAMPAIGN_MAX_RECIPIENTS,
  getClickSendSendMode,
  assertClickSendRecipientCount,
} from './limits';
export type { ClickSendSendMode } from './limits';

export {
  listSmsTemplates,
  getSmsTemplate,
  createSmsTemplate,
  updateSmsTemplate,
  deleteSmsTemplate,
} from './templates';
export type { ClickSendTemplate } from './templates';

export { ClickSendApiError, toE164 } from './http';
