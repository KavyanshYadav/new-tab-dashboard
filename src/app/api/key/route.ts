import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { findUser, regenerateUserApiKey } from '@/lib/server-storage';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId');
  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key');

  if (!userId && !apiKey) {
    return jsonResponse({ valid: false, error: 'Unauthorized: User ID or API key is required' }, 401);
  }

  const user = findUser({ userId, apiKey });
  if (!user) {
    return jsonResponse({ valid: false, error: 'Unauthorized: Account not found' }, 401);
  }

  return jsonResponse({
    valid: true,
    userId: user.userId,
    username: user.username,
    apiKey: user.apiKey,
    totalShortcuts: user.shortcuts.length,
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

    const user = findUser({ userId, apiKey });
    if (!user) {
      return jsonResponse({ error: 'Unauthorized: User not found' }, 401);
    }

    const newApiKey = regenerateUserApiKey(user.userId);

    return jsonResponse({
      success: true,
      userId: user.userId,
      username: user.username,
      apiKey: newApiKey,
      totalShortcuts: user.shortcuts.length,
      createdAt: user.createdAt,
    }, 201);
  } catch {
    return jsonResponse({ success: false, error: 'Failed to regenerate API key' }, 500);
  }
}
