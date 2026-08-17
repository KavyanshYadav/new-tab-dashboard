import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { findUser, toPublicUser } from '@/lib/server-storage';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  const apiKey =
    req.headers.get('x-api-key') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    req.nextUrl.searchParams.get('key');

  if (!apiKey || !apiKey.trim()) {
    return jsonResponse({ user: null, error: 'Unauthorized: API key required' }, 401);
  }

  const user = await findUser({ apiKey: apiKey.trim() });
  if (!user) {
    return jsonResponse({ user: null, error: 'Unauthorized: Invalid API key' }, 401);
  }

  return jsonResponse({
    user: toPublicUser(user),
  });
}

