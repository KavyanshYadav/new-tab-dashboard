import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { findUser, toPublicUser } from '@/lib/server-storage';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId');
  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key');
  const email = req.nextUrl.searchParams.get('email');

  if (!userId && !apiKey && !email) {
    return jsonResponse({ user: null });
  }

  const user = await findUser({ userId, apiKey, email });
  if (!user) {
    return jsonResponse({ user: null });
  }

  return jsonResponse({
    user: toPublicUser(user),
  });
}
