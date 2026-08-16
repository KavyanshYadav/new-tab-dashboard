import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { loginUser } from '@/lib/server-storage';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, email, username, password } = body || {};
    const finalIdentifier = identifier || email || username;

    if (!finalIdentifier) {
      return jsonResponse({ error: 'Email or username is required' }, 400);
    }

    const result = loginUser({
      identifier: finalIdentifier,
      password,
    });

    if (!result.success) {
      return jsonResponse({ error: result.error || 'Authentication failed' }, 401);
    }

    return jsonResponse({
      success: true,
      user: result.user,
      message: 'Signed in successfully',
    });
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }
}
