import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { findUser, regenerateUserApiKey } from '@/lib/server-storage';
import { getClientIp, checkApiReadRateLimit, checkKeyRegenRateLimit } from '@/lib/rate-limiter';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const userId = req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId');
  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key');

  const rateCheck = checkApiReadRateLimit(apiKey || userId || ip);
  if (!rateCheck.allowed) {
    const res = jsonResponse({ valid: false, error: 'Rate limit exceeded. Please wait.' }, 429);
    res.headers.set('Retry-After', String(rateCheck.resetSec));
    return res;
  }

  if (!userId && !apiKey) {
    return jsonResponse({ valid: false, error: 'Unauthorized: User ID or API key is required' }, 401);
  }

  const user = await findUser({ userId, apiKey });
  if (!user) {
    return jsonResponse({ valid: false, error: 'Unauthorized: Account not found' }, 401);
  }

  return jsonResponse({
    valid: true,
    userId: user.userId,
    username: user.username,
    apiKey: user.apiKey,
    totalShortcuts: user.shortcuts ? user.shortcuts.length : 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = req.headers.get('x-user-id') || body?.userId;
    const apiKey = req.headers.get('x-api-key') || body?.apiKey;

    if (!userId && !apiKey) {
      return jsonResponse({ error: 'Unauthorized: Only signed-in users can regenerate an API key' }, 401);
    }

    const user = await findUser({ userId, apiKey });
    if (!user) {
      return jsonResponse({ error: 'Unauthorized: User not found' }, 401);
    }

    // Rate limit key regenerations (max 3 per 10 mins)
    const regenCheck = checkKeyRegenRateLimit(user.userId);
    if (!regenCheck.allowed) {
      const res = jsonResponse(
        { error: `Too many key regeneration attempts. Please wait ${regenCheck.resetSec} seconds.` },
        429
      );
      res.headers.set('Retry-After', String(regenCheck.resetSec));
      return res;
    }

    const newApiKey = await regenerateUserApiKey(user.userId);

    return jsonResponse(
      {
        success: true,
        userId: user.userId,
        username: user.username,
        apiKey: newApiKey,
        totalShortcuts: user.shortcuts ? user.shortcuts.length : 0,
        createdAt: user.createdAt,
      },
      201
    );
  } catch {
    return jsonResponse({ success: false, error: 'Failed to regenerate API key' }, 500);
  }
}
