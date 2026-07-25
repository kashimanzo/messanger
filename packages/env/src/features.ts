export type MessagingChannel = 'WHATSAPP' | 'SMS';

function parseBool(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export type MessagingFeatures = {
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  channels: MessagingChannel[];
  defaultChannel: MessagingChannel | null;
  /** Default ClickSend campaign sender from CLICKSEND_FROM (if set). */
  clickSendFrom: string | null;
};

/**
 * Reads messaging feature flags from env.
 *
 * FEATURE_SMS_ENABLED=true selects ClickSend SMS and hides WhatsApp screens.
 * When it is false or omitted, the existing WhatsApp integration is selected.
 */
export function getMessagingFeatures(): MessagingFeatures {
  const smsEnabled = parseBool(process.env['FEATURE_SMS_ENABLED'], false);
  const whatsappEnabled = !smsEnabled;
  const channels: MessagingChannel[] = smsEnabled ? ['SMS'] : ['WHATSAPP'];
  const clickSendFrom = process.env['CLICKSEND_FROM']?.trim() || null;

  return {
    whatsappEnabled,
    smsEnabled,
    channels,
    defaultChannel: channels[0] ?? null,
    clickSendFrom: smsEnabled ? clickSendFrom : null,
  };
}

export function assertChannelEnabled(channel: MessagingChannel) {
  const features = getMessagingFeatures();

  if (channel === 'WHATSAPP' && !features.whatsappEnabled) {
    throw new Error(
      'WhatsApp messaging is disabled while SMS mode is active. Set FEATURE_SMS_ENABLED=false.',
    );
  }

  if (channel === 'SMS' && !features.smsEnabled) {
    throw new Error(
      'SMS messaging is disabled. Set FEATURE_SMS_ENABLED=true to use ClickSend.',
    );
  }
}
