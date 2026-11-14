import { calculateSmsMessagesPrice } from './price';
import { clickSendRequest } from './http';

export type ClickSendCurrency = {
  currencyNameShort?: string;
  currencyPrefix?: string;
};

export type ClickSendAccountBalance = {
  balance: number;
  currency?: string;
  currencyPrefix?: string;
  country?: string;
  username?: string;
  accountName?: string;
  /** Approximate SMS count for a standard 1-segment message to the account default country. */
  estimatedSmsCount: number | null;
  estimatedSmsUnitPrice: number | null;
  estimatedSmsNote: string;
};

export type ClickSendPaymentCard = {
  /** Synthetic id — ClickSend API exposes a single active card per account. */
  id: string;
  displayNumber: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  name: string | null;
  bankName?: string | null;
  isDefault: boolean;
  hasCard: boolean;
};

export type ClickSendRechargePackage = {
  packageId: number;
  name: string;
  /** Dashboard category: Credit Pack or Power Pack (tiered rate). */
  category: 'credit' | 'power';
  price: number;
  currency?: string;
  currencyPrefix?: string;
  /** Per-SMS rate unlocked by this top-up tier. */
  smsUnitPrice: number | null;
  estimatedSmsCount: number | null;
  priceRate?: number;
};

export type ClickSendPurchaseResult = {
  amount: number;
  currency?: string;
  date?: number;
};

export type ClickSendPaymentCardInput = {
  number: string;
  expiryMonth: number;
  expiryYear: number;
  cvc: string;
  name: string;
  bankName: string;
};

export type ClickSendTransaction = {
  id: string;
  invoiceNumber?: string;
  amount: number;
  currency?: string;
  date?: number;
  type?: string;
  description?: string;
};

type RawAccount = {
  balance?: string | number;
  username?: string;
  account_name?: string;
  country?: string;
  default_country_sms?: string;
  _currency?: {
    currency_name_short?: string;
    currency_prefix?: string;
  };
};

type RawCard = {
  display_number?: string;
  expiry_month?: number;
  expiry_year?: number;
  name?: string;
  bank_name?: string;
};

type RawPackage = {
  package_id?: number;
  id?: number;
  name?: string;
  package_name?: string;
  title?: string;
  /** ClickSend's actual field for package cost. */
  package_price?: string | number;
  price?: string | number;
  amount?: string | number;
  value?: string | number;
  credit?: string | number;
  sms_price?: string | number;
  sms_quantity?: string | number;
  price_rate?: string | number;
};

function samplePhoneForCountry(country?: string) {
  const code = (country ?? 'GB').toUpperCase();
  const samples: Record<string, string> = {
    GB: '447700900000',
    UK: '447700900000',
    US: '12025550123',
    AU: '61491570156',
    CA: '12025550123',
  };
  return samples[code] ?? samples.GB!;
}

function parseCurrency(raw?: RawAccount['_currency'], fallback?: string) {
  return {
    currency:
      raw?.currency_name_short ??
      (typeof fallback === 'string' ? fallback : undefined),
    currencyPrefix: raw?.currency_prefix,
  };
}

async function estimateUnitSmsPrice(options: {
  country?: string;
  from?: string;
}): Promise<{ unitPrice: number; currency?: string } | null> {
  try {
    const sampleBody =
      'Bulk Messanger balance estimate. This is a standard one-segment SMS.';
    const price = await calculateSmsMessagesPrice({
      body: sampleBody,
      phoneNumbers: [samplePhoneForCountry(options.country)],
      from: options.from,
    });
    if (!price.price || price.price <= 0) {
      return null;
    }
    return { unitPrice: price.price, currency: price.currency };
  } catch {
    return null;
  }
}

export async function getClickSendAccountBalance(): Promise<ClickSendAccountBalance> {
  const response = await clickSendRequest<RawAccount>('/account');
  const data = response.data ?? {};
  const balance = Number(data.balance ?? 0) || 0;
  const country = data.default_country_sms || data.country;
  const { currency, currencyPrefix } = parseCurrency(data._currency);
  const estimate = await estimateUnitSmsPrice({ country });

  const unitPrice = estimate?.unitPrice ?? null;
  const estimatedSmsCount =
    unitPrice && unitPrice > 0 ? Math.floor(balance / unitPrice) : null;

  return {
    balance,
    currency: estimate?.currency ?? currency,
    currencyPrefix,
    country,
    username: data.username,
    accountName: data.account_name,
    estimatedSmsCount,
    estimatedSmsUnitPrice: unitPrice,
    estimatedSmsNote:
      'Estimate for a standard 1-segment SMS to your account default country. Actual cost varies by destination and message length.',
  };
}

function emptyCard(): ClickSendPaymentCard {
  return {
    id: 'none',
    displayNumber: null,
    expiryMonth: null,
    expiryYear: null,
    name: null,
    bankName: null,
    isDefault: false,
    hasCard: false,
  };
}

export async function getClickSendPaymentCard(): Promise<ClickSendPaymentCard> {
  try {
    const response = await clickSendRequest<RawCard>('/recharge/credit-card');
    const data = response.data ?? {};
    const displayNumber =
      typeof data.display_number === 'string' ? data.display_number : null;

    if (!displayNumber) {
      return emptyCard();
    }

    return {
      id: 'default',
      displayNumber,
      expiryMonth:
        typeof data.expiry_month === 'number' ? data.expiry_month : null,
      expiryYear: typeof data.expiry_year === 'number' ? data.expiry_year : null,
      name: typeof data.name === 'string' ? data.name : null,
      bankName: typeof data.bank_name === 'string' ? data.bank_name : null,
      isDefault: true,
      hasCard: true,
    };
  } catch {
    return emptyCard();
  }
}

/** ClickSend REST only exposes one active card; returned as a list for UI selection. */
export async function listClickSendPaymentCards(): Promise<{
  cards: ClickSendPaymentCard[];
  /** ClickSend charges this single on-file card for package purchases. */
  supportsMultipleCards: false;
}> {
  const card = await getClickSendPaymentCard();
  return {
    cards: card.hasCard ? [card] : [],
    supportsMultipleCards: false,
  };
}

function extractPackageList(payload: unknown): RawPackage[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const raw = payload as Record<string, unknown>;
  if (Array.isArray(raw.packages)) {
    return raw.packages as RawPackage[];
  }
  if (Array.isArray(raw.data)) {
    return raw.data as RawPackage[];
  }
  if (
    raw.data &&
    typeof raw.data === 'object' &&
    Array.isArray((raw.data as { packages?: unknown }).packages)
  ) {
    return (raw.data as { packages: RawPackage[] }).packages;
  }
  return [];
}

export async function listClickSendRechargePackages(options?: {
  country?: string;
}): Promise<{
  packages: ClickSendRechargePackage[];
  currency?: string;
  currencyPrefix?: string;
  country?: string;
}> {
  const account = await getClickSendAccountBalance();
  const preferredCountry = (
    options?.country ??
    account.country ??
    'GB'
  ).toUpperCase();

  // Prefer the account billing country so SMS quantities match the dashboard.
  const countries = [
    ...new Set([preferredCountry, 'GB', 'US', 'AU'].filter(Boolean)),
  ];

  let list: RawPackage[] = [];
  let currency = account.currency ?? undefined;
  let currencyPrefix = account.currencyPrefix;
  let usedCountry = preferredCountry;

  for (const country of countries) {
    try {
      const response = await clickSendRequest<Record<string, unknown>>(
        '/recharge/packages',
        { query: { country } },
      );
      const next = extractPackageList(response.data ?? response);
      if (next.length > 0) {
        list = next;
        usedCountry = country;
        const currencyObj = (
          response.data as
            | {
                currency?: {
                  currency_name_short?: string;
                  currency_prefix_d?: string;
                };
              }
            | undefined
        )?.currency;
        currency = currencyObj?.currency_name_short ?? currency;
        currencyPrefix = currencyObj?.currency_prefix_d ?? currencyPrefix;
        break;
      }
    } catch {
      // Try next country.
    }
  }

  const packagesById = new Map<number, ClickSendRechargePackage>();
  const prefix = currencyPrefix || (currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '');

  for (const entry of list) {
    const packageId = Number(entry.package_id ?? entry.id ?? 0);
    // ClickSend uses `package_price` (not `price`) for recharge / Power Packs.
    const price =
      Number(
        entry.package_price ??
          entry.price ??
          entry.amount ??
          entry.value ??
          entry.credit ??
          0,
      ) || 0;
    if (!packageId || price <= 0) {
      continue;
    }

    const priceRate = Number(entry.price_rate ?? 0) || 0;
    const smsQuantity = Number(entry.sms_quantity ?? 0) || 0;
    const smsUnitPrice = Number(entry.sms_price ?? 0) || null;
    // Dashboard: higher pricing tiers are shown as Power Packs.
    const category: 'credit' | 'power' = priceRate > 0 ? 'power' : 'credit';
    const amountLabel = prefix
      ? `${prefix}${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`
      : `${price.toFixed(2)}${currency ? ` ${currency}` : ''}`;
    const name =
      entry.name ||
      entry.package_name ||
      entry.title ||
      `${amountLabel} ${category === 'power' ? 'Power Pack' : 'Credit Pack'}`;

    packagesById.set(packageId, {
      packageId,
      name,
      category,
      price,
      currency,
      currencyPrefix: prefix || undefined,
      smsUnitPrice,
      estimatedSmsCount: smsQuantity > 0 ? smsQuantity : null,
      priceRate,
    });
  }

  const packages = [...packagesById.values()].sort(
    (left, right) => left.price - right.price,
  );

  return { packages, currency, currencyPrefix: prefix || undefined, country: usedCountry };
}

export async function purchaseClickSendRechargePackage(
  packageId: number,
): Promise<ClickSendPurchaseResult> {
  const response = await clickSendRequest<{
    amount?: number;
    currency?: string;
    date?: number;
  }>(`/recharge/purchase/${packageId}`, {
    method: 'PUT',
  });

  const data = response.data ?? {};
  return {
    amount: Number(data.amount ?? 0) || 0,
    currency: typeof data.currency === 'string' ? data.currency : undefined,
    date: typeof data.date === 'number' ? data.date : undefined,
  };
}

/**
 * Saves a card on the ClickSend account.
 * Card data is forwarded to ClickSend only — never persisted by this app.
 */
export async function updateClickSendPaymentCard(
  input: ClickSendPaymentCardInput,
): Promise<ClickSendPaymentCard> {
  const number = input.number.replace(/\D/g, '');
  const cvcDigits = input.cvc.replace(/\D/g, '');

  await clickSendRequest<{ token?: string }>('/recharge/credit-card', {
    method: 'PUT',
    body: {
      number,
      expiry_month: input.expiryMonth,
      expiry_year: input.expiryYear,
      cvc: Number(cvcDigits),
      name: input.name.trim(),
      bank_name: input.bankName.trim(),
    },
  });

  return getClickSendPaymentCard();
}

export async function listClickSendTransactions(options?: {
  page?: number;
  limit?: number;
}): Promise<{
  transactions: ClickSendTransaction[];
  total: number;
  page: number;
  lastPage: number;
}> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;

  const response = await clickSendRequest<{
    total?: number;
    current_page?: number;
    last_page?: number;
    data?: Array<Record<string, unknown>>;
  }>('/recharge/transactions', {
    query: { page, limit },
  });

  const raw = response.data ?? {};
  const rows = Array.isArray(raw.data) ? raw.data : [];

  const transactions: ClickSendTransaction[] = rows.map((entry, index) => {
    const invoiceNumber =
      typeof entry.invoice_number === 'string'
        ? entry.invoice_number
        : typeof entry.transaction_id === 'string'
          ? entry.transaction_id
          : undefined;
    const amount = Number(entry.amount ?? entry.price ?? 0) || 0;
    const date =
      typeof entry.date === 'number'
        ? entry.date
        : typeof entry.created === 'number'
          ? entry.created
          : undefined;

    return {
      id: invoiceNumber || `${date ?? 'tx'}-${index}`,
      invoiceNumber,
      amount,
      currency:
        typeof entry.currency === 'string' ? entry.currency : undefined,
      date,
      type: typeof entry.type === 'string' ? entry.type : undefined,
      description:
        typeof entry.description === 'string'
          ? entry.description
          : typeof entry.notes === 'string'
            ? entry.notes
            : undefined,
    };
  });

  return {
    transactions,
    total: Number(raw.total ?? transactions.length) || transactions.length,
    page: Number(raw.current_page ?? page) || page,
    lastPage: Number(raw.last_page ?? 1) || 1,
  };
}
