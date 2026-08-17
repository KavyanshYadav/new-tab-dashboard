import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { getUserCategories, findUser } from '@/lib/server-storage';
import { getClientIp, checkApiReadRateLimit } from '@/lib/rate-limiter';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const apiKey =
    req.headers.get('x-api-key') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    req.nextUrl.searchParams.get('key');

  const rateCheck = checkApiReadRateLimit(apiKey || ip);
  if (!rateCheck.allowed) {
    const res = jsonResponse({ error: 'Rate limit exceeded.' }, 429);
    res.headers.set('Retry-After', String(rateCheck.resetSec));
    return res;
  }

  if (!apiKey || !apiKey.trim()) {
    return jsonResponse({ error: 'Unauthorized: API key is required' }, 401);
  }

  const user = await findUser({ apiKey: apiKey.trim() });
  if (!user) {
    return jsonResponse({ error: 'Unauthorized: Account not found' }, 401);
  }


  const categories = await getUserCategories(user.userId);
  return jsonResponse({
    userId: user.userId,
    categories,
  });
}
