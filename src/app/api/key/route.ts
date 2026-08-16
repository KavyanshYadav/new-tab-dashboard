import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { getOrCreateUser, generateApiKey } from '@/lib/server-storage';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key');

  if (!apiKey) {
    return jsonResponse({ valid: false, error: 'API key is required' }, 400);
  }

  const user = getOrCreateUser(apiKey);
  return jsonResponse({
    valid: true,
    apiKey: user.apiKey,
    totalShortcuts: user.shortcuts.length,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedKey = body?.apiKey;
    const newKey = requestedKey || generateApiKey();
    const user = getOrCreateUser(newKey);

    return jsonResponse({
      success: true,
      apiKey: user.apiKey,
      totalShortcuts: user.shortcuts.length,
      createdAt: user.createdAt,
    }, 201);
  } catch {
    return jsonResponse({ success: false, error: 'Failed to generate API key' }, 500);
  }
}
