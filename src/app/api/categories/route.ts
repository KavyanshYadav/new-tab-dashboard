import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { getUserCategories, findUser } from '@/lib/server-storage';
import { getClientIp, checkApiReadRateLimit } from '@/lib/rate-limiter';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const userId = req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId');
  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key');

  const rateCheck = checkApiReadRateLimit(apiKey || userId || ip);
  if (!rateCheck.allowed) {
    const res = jsonResponse({ error: 'Rate limit exceeded.' }, 429);
    res.headers.set('Retry-After', String(rateCheck.resetSec));
    return res;
  }

  if (!userId && !apiKey) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const user = await findUser({ userId, apiKey });
  if (!user) {
    return jsonResponse({ error: 'Unauthorized: User not found' }, 401);
  }

  const categories = await getUserCategories(user.userId);
  return jsonResponse({
    userId: user.userId,
    categories,
  });
}
