const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:4200',
  'http://localhost:4300',
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'https://localhost',
];

function getAllowedOrigins(): Set<string> {
  const origins = new Set(DEFAULT_ORIGINS);

  for (const value of [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.CORS_ALLOWED_ORIGINS,
  ]) {
    if (!value) continue;

    if (value.includes(',')) {
      value.split(',').forEach((origin) => {
        const trimmed = origin.trim();
        if (trimmed) origins.add(trimmed);
      });
      continue;
    }

    origins.add(value);
  }

  return origins;
}

function buildCorsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With, trpc-batch-mode, trpc-accept, x-trpc-source',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': 'set-auth-token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };

  if (origin && getAllowedOrigins().has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

type RouteContext = { params: Promise<Record<string, string | string[]>> };

type RouteHandler = (
  req: Request,
  context: RouteContext,
) => Promise<Response> | Response;

export function withCors(handler: RouteHandler): RouteHandler {
  return async (req, context) => {
    const origin = req.headers.get('origin');
    const corsHeaders = buildCorsHeaders(origin);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const response = await handler(req, context);
    const headers = new Headers(response.headers);

    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
