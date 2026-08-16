import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { registerUser } from '@/lib/server-storage';
import { getClientIp, checkRegisterRateLimit } from '@/lib/rate-limiter';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateCheck = checkRegisterRateLimit(ip);

  if (!rateCheck.allowed) {
    const res = jsonResponse(
      {
        error: `Too many registration attempts from this IP. Please try again in ${rateCheck.resetSec} seconds.`,
      },
      429
    );
    res.headers.set('Retry-After', String(rateCheck.resetSec));
    res.headers.set('X-RateLimit-Reset', String(rateCheck.resetSec));
    return res;
  }

  try {
    const body = await req.json();
    const { username, email, password, turnstileToken } = body || {};

    if (!username || !email || !password) {
      return jsonResponse({ error: 'Username, email, and password are required' }, 400);
    }

    // Verify Cloudflare Turnstile Bot Challenge Token
    const turnstileCheck = await verifyTurnstileToken(turnstileToken, ip);
    if (!turnstileCheck.success) {
      return jsonResponse(
        { error: turnstileCheck.error || 'Cloudflare Turnstile verification failed. Please complete the security check.' },
        400
      );
    }

    const result = registerUser({ username, email, password });
    if (!result.success) {
      return jsonResponse({ error: result.error || 'Registration failed' }, 400);
    }

    return jsonResponse(
      {
        success: true,
        user: result.user,
        message: 'Account created successfully',
      },
      201
    );
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }
}
