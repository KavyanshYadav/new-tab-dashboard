import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { loginUser } from '@/lib/server-storage';
import {
  getClientIp,
  checkLoginIpRateLimit,
  checkAccountLockout,
  recordFailedLogin,
  resetFailedLogin,
} from '@/lib/rate-limiter';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // 1. Check IP-Level Rate Limit
  const ipRateCheck = checkLoginIpRateLimit(ip);
  if (!ipRateCheck.allowed) {
    const res = jsonResponse(
      {
        error: `Too many login attempts from this network. Please wait ${ipRateCheck.resetSec} seconds before trying again.`,
      },
      429
    );
    res.headers.set('Retry-After', String(ipRateCheck.resetSec));
    return res;
  }

  try {
    const body = await req.json();
    const { identifier, email, username, password, turnstileToken } = body || {};
    const finalIdentifier = identifier || email || username;

    if (!finalIdentifier) {
      return jsonResponse({ error: 'Email or username is required' }, 400);
    }

    // 2. Verify Cloudflare Turnstile Bot Challenge Token (if password is provided, or for credentials)
    const turnstileCheck = await verifyTurnstileToken(turnstileToken, ip);
    if (!turnstileCheck.success) {
      return jsonResponse(
        { error: turnstileCheck.error || 'Cloudflare Turnstile verification failed. Please complete the security check.' },
        400
      );
    }

    // 3. Check Account-Level Lockout (Brute Force Defense)
    const lockout = checkAccountLockout(finalIdentifier);
    if (lockout.locked) {
      const res = jsonResponse(
        {
          error: `Account temporarily locked due to multiple failed login attempts. Please try again in ${Math.ceil(
            lockout.remainingSec / 60
          )} minute(s).`,
        },
        429
      );
      res.headers.set('Retry-After', String(lockout.remainingSec));
      return res;
    }

    const result = await loginUser({
      identifier: finalIdentifier,
      password,
    });

    if (!result.success) {
      recordFailedLogin(finalIdentifier);
      return jsonResponse({ error: result.error || 'Authentication failed' }, 401);
    }

    // Reset failed counter on success
    resetFailedLogin(finalIdentifier);

    return jsonResponse({
      success: true,
      user: result.user,
      message: 'Signed in successfully',
    });
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }
}
