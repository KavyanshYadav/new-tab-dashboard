import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { registerUser } from '@/lib/server-storage';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, password } = body || {};

    if (!username || !email || !password) {
      return jsonResponse({ error: 'Username, email, and password are required' }, 400);
    }

    const result = registerUser({ username, email, password });
    if (!result.success) {
      return jsonResponse({ error: result.error || 'Registration failed' }, 400);
    }

    return jsonResponse({
      success: true,
      user: result.user,
      message: 'Account created successfully',
    }, 201);
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }
}
