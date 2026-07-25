export type WhatsAppCredentials = {
  accessToken: string;
  phoneNumberId: string;
};

export function getWhatsAppCredentials(): WhatsAppCredentials {
  const accessToken =
    process.env['WHATSAPP_ACCESS_TOKEN'] ?? process.env['ACCESS_TOKEN'];
  const phoneNumberId =
    process.env['WHATSAPP_PHONE_NUMBER_ID'] ?? process.env['PHONE_NUMBER_ID'];

  if (!accessToken || !phoneNumberId) {
    throw new Error(
      'WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in your .env file.',
    );
  }

  return { accessToken, phoneNumberId };
}
