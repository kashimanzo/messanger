import { getWhatsAppCredentials } from './credentials';

const WHATSAPP_API_VERSION = 'v19.0';

type GraphTemplateComponent = {
  type?: string;
  text?: string;
  format?: string;
};

type GraphMessageTemplate = {
  id?: string;
  name: string;
  language: string;
  status: string;
  category?: string;
  components?: GraphTemplateComponent[];
};

type GraphTemplatesResponse = {
  data?: GraphMessageTemplate[];
  paging?: {
    next?: string;
  };
  error?: { message?: string };
};

export type TemplateVariable = {
  component: 'body' | 'header';
  index: number;
  label: string;
};

export type WhatsAppTemplate = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string | null;
  preview: string;
  variables: TemplateVariable[];
};

function getWhatsAppBusinessAccountId(): string {
  const wabaId =
    process.env['WHATSAPP_BUSINESS_ACCOUNT_ID'] ?? process.env['WABA_ID'];

  if (!wabaId) {
    throw new Error(
      'WhatsApp Business Account ID is not configured. Set WHATSAPP_BUSINESS_ACCOUNT_ID or WABA_ID in your .env file.',
    );
  }

  return wabaId;
}

function extractVariables(
  componentType: 'body' | 'header',
  text?: string,
): TemplateVariable[] {
  if (!text) {
    return [];
  }

  const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
  const seen = new Set<number>();

  return matches
    .map((match) => Number(match[1]))
    .filter((index) => {
      if (seen.has(index)) {
        return false;
      }

      seen.add(index);
      return true;
    })
    .sort((left, right) => left - right)
    .map((index) => ({
      component: componentType,
      index: index - 1,
      label: `${componentType === 'body' ? 'Body' : 'Header'} variable ${index}`,
    }));
}

function buildPreview(components: GraphTemplateComponent[] = []): string {
  return components
    .filter((component) => component.type === 'BODY' || component.type === 'HEADER')
    .map((component) => component.text?.trim())
    .filter(Boolean)
    .join('\n\n');
}

function serializeTemplate(template: GraphMessageTemplate): WhatsAppTemplate {
  const components = template.components ?? [];
  const bodyText = components.find((component) => component.type === 'BODY')?.text;
  const headerText = components.find((component) => component.type === 'HEADER')?.text;

  return {
    id: template.id ?? `${template.name}:${template.language}`,
    name: template.name,
    language: template.language,
    status: template.status,
    category: template.category ?? null,
    preview: buildPreview(components) || bodyText || headerText || template.name,
    variables: [
      ...extractVariables('header', headerText),
      ...extractVariables('body', bodyText),
    ],
  };
}

async function fetchTemplatesPage(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = (await response.json()) as GraphTemplatesResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `Failed to load templates (HTTP ${response.status})`);
  }

  return data;
}

export async function listMessageTemplates(): Promise<WhatsAppTemplate[]> {
  const { accessToken } = getWhatsAppCredentials();
  const wabaId = getWhatsAppBusinessAccountId();

  const fields = 'id,name,language,status,category,components';
  let nextUrl: string | undefined =
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${wabaId}/message_templates?fields=${fields}&limit=100`;

  const templates: WhatsAppTemplate[] = [];

  while (nextUrl) {
    const page = await fetchTemplatesPage(nextUrl, accessToken);

    for (const template of page.data ?? []) {
      if (template.status === 'APPROVED') {
        templates.push(serializeTemplate(template));
      }
    }

    nextUrl = page.paging?.next;
  }

  return templates.sort((left, right) => left.name.localeCompare(right.name));
}

export function buildTemplateMessageComponents(
  variables: Array<{
    component: 'body' | 'header';
    index: number;
    value: string;
  }>,
) {
  const headerParameters = variables
    .filter((variable) => variable.component === 'header')
    .sort((left, right) => left.index - right.index)
    .map((variable) => ({
      type: 'text' as const,
      text: variable.value,
    }));

  const bodyParameters = variables
    .filter((variable) => variable.component === 'body')
    .sort((left, right) => left.index - right.index)
    .map((variable) => ({
      type: 'text' as const,
      text: variable.value,
    }));

  const components: Array<Record<string, unknown>> = [];

  if (headerParameters.length > 0) {
    components.push({
      type: 'header',
      parameters: headerParameters,
    });
  }

  if (bodyParameters.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParameters,
    });
  }

  return components;
}
