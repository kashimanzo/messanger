import { getWhatsAppCredentials } from './credentials';
import {
  isWhatsAppRateLimitError,
  parseRateLimitHeaders,
} from './rate-limit';
import { buildTemplateMessageComponents } from './templates';
import { TEST_RECIPIENTS } from './test-recipients';

const WHATSAPP_API_VERSION = 'v19.0';
const SEND_DELAY_MS = 1000;

type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  templateName: string;
  templateLanguage?: string;
};

export type SendResult = {
  to: string;
  success: boolean;
  messageId?: string;
  error?: string;
  rateLimited?: boolean;
  retryAfterMs?: number;
};

export type SendResultWithMeta = {
  result: SendResult;
  rateLimit?: {
    retryAfterMs?: number;
    remaining?: number;
  };
};

export type TemplateSendOptions = {
  name: string;
  language: string;
  variables?: Array<{
    component: 'body' | 'header';
    index: number;
    value: string;
  }>;
};

function getWhatsAppConfig(): WhatsAppConfig {
  const credentials = getWhatsAppCredentials();
  const templateName =
    process.env['WHATSAPP_TEMPLATE_NAME'] ?? process.env['TEMPLATE_NAME'];

  if (!templateName) {
    throw new Error(
      'WhatsApp template is not configured. Set WHATSAPP_TEMPLATE_NAME in your .env file.',
    );
  }

  return {
    ...credentials,
    templateName,
    templateLanguage: process.env['WHATSAPP_TEMPLATE_LANGUAGE'] ?? 'en_US',
  };
}

function buildTemplatePayload(
  template: TemplateSendOptions,
) {
  const components = buildTemplateMessageComponents(template.variables ?? []);

  return {
    name: template.name,
    language: {
      code: template.language,
    },
    ...(components.length > 0 ? { components } : {}),
  };
}

async function sendWhatsAppPayload(
  toNumber: string,
  payload: Record<string, unknown>,
  credentials: ReturnType<typeof getWhatsAppCredentials>,
): Promise<SendResultWithMeta> {
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${credentials.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rateLimit = parseRateLimitHeaders(response.headers);
    const data = (await response.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string; code?: number; error_subcode?: number };
    };

    if (!response.ok) {
      const errorMessage = data.error?.message ?? `HTTP ${response.status}`;
      const rateLimited = isWhatsAppRateLimitError(
        response.status,
        errorMessage,
        data.error?.code ?? data.error?.error_subcode,
      );

      return {
        result: {
          to: toNumber,
          success: false,
          error: errorMessage,
          rateLimited,
          retryAfterMs: rateLimit.retryAfterMs,
        },
        rateLimit,
      };
    }

    return {
      result: {
        to: toNumber,
        success: true,
        messageId: data.messages?.[0]?.id,
      },
      rateLimit,
    };
  } catch (error) {
    return {
      result: {
        to: toNumber,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

export async function sendTemplateMessage(
  toNumber: string,
  template: TemplateSendOptions,
  credentials = getWhatsAppCredentials(),
): Promise<SendResultWithMeta> {
  return sendWhatsAppPayload(
    toNumber,
    {
      messaging_product: 'whatsapp',
      to: toNumber,
      type: 'template',
      template: buildTemplatePayload(template),
    },
    credentials,
  );
}

export async function sendMarketingMessage(
  toNumber: string,
  config?: WhatsAppConfig,
): Promise<SendResult> {
  const resolvedConfig = config ?? getWhatsAppConfig();

  const response = await sendTemplateMessage(
    toNumber,
    {
      name: resolvedConfig.templateName,
      language: resolvedConfig.templateLanguage ?? 'en_US',
    },
    resolvedConfig,
  );

  return response.result;
}

export async function sendTextMessage(
  toNumber: string,
  message: string,
  credentials = getWhatsAppCredentials(),
): Promise<SendResultWithMeta> {
  return sendWhatsAppPayload(
    toNumber,
    {
      messaging_product: 'whatsapp',
      to: toNumber,
      type: 'text',
      text: {
        preview_url: false,
        body: message,
      },
    },
    credentials,
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendBulkMessages(
  recipients: string[],
  send: (recipient: string) => Promise<SendResult>,
) {
  const results: SendResult[] = [];

  for (const recipient of recipients) {
    const result = await send(recipient);
    results.push(result);

    if (recipient !== recipients[recipients.length - 1]) {
      await delay(SEND_DELAY_MS);
    }
  }

  const successCount = results.filter((r) => r.success).length;

  return {
    total: results.length,
    successCount,
    failureCount: results.length - successCount,
    results,
  };
}

export async function sendBulkTestCampaign(recipients = [...TEST_RECIPIENTS]) {
  const config = getWhatsAppConfig();
  const campaign = await sendBulkMessages(recipients, (recipient) =>
    sendMarketingMessage(recipient, config),
  );

  return {
    ...campaign,
    templateName: config.templateName,
  };
}

export async function sendBulkTextCampaign(message: string, recipients: string[]) {
  const credentials = getWhatsAppCredentials();

  return sendBulkMessages(recipients, async (recipient) => {
    const response = await sendTextMessage(recipient, message, credentials);
    return response.result;
  });
}

export async function sendBulkTemplateCampaign(
  recipients: string[],
  template: TemplateSendOptions,
) {
  const credentials = getWhatsAppCredentials();
  const campaign = await sendBulkMessages(recipients, async (recipient) => {
    const response = await sendTemplateMessage(recipient, template, credentials);
    return response.result;
  });

  return {
    ...campaign,
    templateName: template.name,
    language: template.language,
  };
}
