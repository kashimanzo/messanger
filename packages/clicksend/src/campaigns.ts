import { getClickSendCredentials } from './credentials';
import { clickSendRequest, type ClickSendApiResponse } from './http';

export type ClickSendCampaign = {
  smsCampaignId: number;
  name: string;
  listId: number;
  listName?: string;
  from?: string;
  body: string;
  status: string;
  schedule?: number;
  dateAdded?: number;
  totalCount?: number;
  customString?: string | null;
};

export type ClickSendCampaignPrice = {
  price: number;
  currency?: string;
  totalCount?: number;
  raw: unknown;
};

type RawCampaign = {
  sms_campaign_id?: number | string;
  name?: string;
  list_id?: number | string;
  from?: string;
  body?: string;
  status?: string;
  schedule?: number;
  date_added?: number;
  custom_string?: string | null;
  _total_count?: number;
  _list_name?: string;
};

type SendCampaignData = {
  total_count?: number;
  sms_campaign?: RawCampaign;
  sms_campaign_id?: number | string;
} & RawCampaign;

type PaginatedCampaigns = {
  data?: RawCampaign[];
  total?: number;
};

function mapCampaign(raw: RawCampaign): ClickSendCampaign {
  const smsCampaignId = Number(raw.sms_campaign_id);
  if (!Number.isFinite(smsCampaignId) || smsCampaignId <= 0) {
    throw new Error('ClickSend did not return a campaign ID.');
  }

  return {
    smsCampaignId,
    name: raw.name ?? `Campaign ${smsCampaignId}`,
    listId: Number(raw.list_id) || 0,
    listName: raw._list_name,
    from: raw.from,
    body: raw.body ?? '',
    status: raw.status ?? 'Unknown',
    schedule: raw.schedule,
    dateAdded: raw.date_added,
    totalCount: raw._total_count,
    customString: raw.custom_string,
  };
}

/** Send nests the campaign under data.sms_campaign; get/list return it on data. */
function extractCampaign(
  response: ClickSendApiResponse<SendCampaignData | RawCampaign>,
): ClickSendCampaign {
  const data = response.data;
  if (!data || typeof data !== 'object') {
    throw new Error(
      response.response_msg ?? 'ClickSend did not return campaign data.',
    );
  }

  const nested =
    'sms_campaign' in data && data.sms_campaign
      ? data.sms_campaign
      : (data as RawCampaign);

  return mapCampaign(nested);
}

function resolveFrom(from?: string) {
  const credentials = getClickSendCredentials();
  const sender = from?.trim() || credentials.from;
  if (!sender) {
    throw new Error(
      'ClickSend sender is required for campaigns. Set CLICKSEND_FROM or pass a from value.',
    );
  }
  return sender;
}

export type CampaignPayload = {
  listId: number;
  name: string;
  body: string;
  from?: string;
  schedule?: number;
};

export async function sendSmsCampaign(
  payload: CampaignPayload,
): Promise<ClickSendCampaign> {
  const from = resolveFrom(payload.from);
  const response = await clickSendRequest<SendCampaignData>(
    '/sms-campaigns/send',
    {
      method: 'POST',
      body: {
        list_id: payload.listId,
        name: payload.name,
        body: payload.body,
        from,
        schedule: payload.schedule,
        source: 'bulk-messanger',
      },
    },
  );

  const campaign = extractCampaign(response);
  if (
    campaign.totalCount === undefined &&
    typeof response.data?.total_count === 'number'
  ) {
    campaign.totalCount = response.data.total_count;
  }
  return campaign;
}

export async function calculateSmsCampaignPrice(
  payload: CampaignPayload,
): Promise<ClickSendCampaignPrice> {
  const from = resolveFrom(payload.from);
  const response = await clickSendRequest<Record<string, unknown>>(
    '/sms-campaigns/price',
    {
      method: 'POST',
      body: {
        list_id: payload.listId,
        name: payload.name,
        body: payload.body,
        from,
        schedule: payload.schedule,
        source: 'bulk-messanger',
      },
    },
  );

  const data = response.data ?? {};
  const currencyObj =
    data.currency && typeof data.currency === 'object'
      ? (data.currency as Record<string, unknown>)
      : undefined;

  const price =
    Number(
      data.total_price ??
        data.price ??
        data._total_price ??
        data.amount ??
        0,
    ) || 0;

  return {
    price,
    currency:
      typeof currencyObj?.currency_name_short === 'string'
        ? currencyObj.currency_name_short
        : typeof data.currency_name_short === 'string'
          ? data.currency_name_short
          : typeof data.currency === 'string'
            ? data.currency
            : undefined,
    totalCount:
      typeof data.total_count === 'number'
        ? data.total_count
        : typeof data._total_count === 'number'
          ? data._total_count
          : undefined,
    raw: data,
  };
}

export async function listSmsCampaigns(options?: {
  page?: number;
  limit?: number;
}): Promise<ClickSendCampaign[]> {
  const response = await clickSendRequest<PaginatedCampaigns>('/sms-campaigns', {
    query: {
      page: options?.page ?? 1,
      limit: options?.limit ?? 50,
      order_by: 'sms_campaign_id:desc',
    },
  });

  return (response.data?.data ?? []).map(mapCampaign);
}

export async function getSmsCampaign(
  smsCampaignId: number,
): Promise<ClickSendCampaign> {
  const response = await clickSendRequest<RawCampaign>(
    `/sms-campaigns/${smsCampaignId}`,
  );
  return extractCampaign(response);
}

export async function cancelSmsCampaign(
  smsCampaignId: number,
): Promise<ClickSendCampaign> {
  const response = await clickSendRequest<SendCampaignData>(
    `/sms-campaigns/${smsCampaignId}/cancel`,
    { method: 'PUT' },
  );
  return extractCampaign(response);
}
