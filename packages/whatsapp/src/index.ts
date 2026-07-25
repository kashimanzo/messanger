export {
  sendBulkTemplateCampaign,
  sendBulkTestCampaign,
  sendBulkTextCampaign,
  sendMarketingMessage,
  sendTemplateMessage,
  sendTextMessage,
} from './client';
export type { SendResult, SendResultWithMeta, TemplateSendOptions } from './client';
export { isWhatsAppRateLimitError, parseRateLimitHeaders } from './rate-limit';
export { getWhatsAppCredentials } from './credentials';
export {
  buildTemplateMessageComponents,
  listMessageTemplates,
} from './templates';
export type { TemplateVariable, WhatsAppTemplate } from './templates';
export { TEST_RECIPIENTS } from './test-recipients';
