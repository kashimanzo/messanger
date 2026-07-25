import { clickSendRequest } from './http';

export type ClickSendTemplate = {
  templateId: number;
  templateName: string;
  body: string;
};

type RawTemplate = {
  template_id?: number;
  template_name?: string;
  body?: string;
};

type PaginatedTemplates = {
  data?: RawTemplate[];
  total?: number;
};

function mapTemplate(raw: RawTemplate): ClickSendTemplate {
  return {
    templateId: Number(raw.template_id),
    templateName: raw.template_name ?? `Template ${raw.template_id}`,
    body: raw.body ?? '',
  };
}

export async function listSmsTemplates(options?: {
  page?: number;
  limit?: number;
}): Promise<ClickSendTemplate[]> {
  const response = await clickSendRequest<PaginatedTemplates>('/sms/templates', {
    query: {
      page: options?.page ?? 1,
      limit: options?.limit ?? 100,
      order_by: 'template_id:desc',
    },
  });

  return (response.data?.data ?? []).map(mapTemplate);
}

export async function getSmsTemplate(
  templateId: number,
): Promise<ClickSendTemplate> {
  const response = await clickSendRequest<RawTemplate>(
    `/sms/templates/${templateId}`,
  );

  if (!response.data?.template_id) {
    throw new Error('ClickSend template not found.');
  }

  return mapTemplate(response.data);
}

export async function createSmsTemplate(input: {
  templateName: string;
  body: string;
}): Promise<ClickSendTemplate> {
  const response = await clickSendRequest<RawTemplate>('/sms/templates', {
    method: 'POST',
    body: {
      template_name: input.templateName,
      body: input.body,
    },
  });

  if (!response.data?.template_id) {
    throw new Error('ClickSend did not return a template ID.');
  }

  return mapTemplate(response.data);
}

export async function updateSmsTemplate(input: {
  templateId: number;
  templateName: string;
  body: string;
}): Promise<ClickSendTemplate> {
  const response = await clickSendRequest<RawTemplate>(
    `/sms/templates/${input.templateId}`,
    {
      method: 'PUT',
      body: {
        template_name: input.templateName,
        body: input.body,
      },
    },
  );

  if (!response.data?.template_id) {
    throw new Error('ClickSend did not return the updated template.');
  }

  return mapTemplate(response.data);
}

export async function deleteSmsTemplate(templateId: number): Promise<void> {
  await clickSendRequest(`/sms/templates/${templateId}`, {
    method: 'DELETE',
  });
}
