import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { findUser, regenerateUserApiKey } from '@/lib/server-storage';
import { getClientIp, checkApiReadRateLimit, checkKeyRegenRateLimit } from '@/lib/rate-limiter';

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
    const res = jsonResponse({ valid: false, error: 'Rate limit exceeded. Please wait.' }, 429);
    res.headers.set('Retry-After', String(rateCheck.resetSec));
    return res;
  }

  if (!apiKey || !apiKey.trim()) {
    return jsonResponse({ valid: false, error: 'Unauthorized: API key is required' }, 401);
  }

  const user = await findUser({ apiKey: apiKey.trim() });
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
    const apiKey =
      req.headers.get('x-api-key') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      body?.apiKey;

    if (!apiKey || !apiKey.trim()) {
      return jsonResponse({ error: 'Unauthorized: Current API key is required to regenerate' }, 401);
    }

    const user = await findUser({ apiKey: apiKey.trim() });
    if (!user) {
      return jsonResponse({ error: 'Unauthorized: Invalid API key' }, 401);
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
