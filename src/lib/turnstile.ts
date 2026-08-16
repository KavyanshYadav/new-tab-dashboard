// Cloudflare Turnstile Server-Side Verification Helper

// Cloudflare Official Always-Pass Testing Keys for Local Development:
// Site Key: 1x00000000000000000000AA
// Secret Key: 1x0000000000000000000000000000000AA
const DEFAULT_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';
const CLOUDFLARE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(
  token: string | undefined | null,
  clientIp?: string
): Promise<{ success: boolean; error?: string }> {
  // If no token provided
  if (!token || !token.trim()) {
    return {
      success: false,
      error: 'Security challenge token is missing. Please complete the Turnstile check.',
    };
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY || DEFAULT_TEST_SECRET_KEY;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token.trim());
    if (clientIp) {
      formData.append('remoteip', clientIp);
    }

    const res = await fetch(CLOUDFLARE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!res.ok) {
      return {
        success: false,
        error: 'Unable to verify security challenge with Cloudflare.',
      };
    }

    const outcome = await res.json();

    if (outcome.success) {
      return { success: true };
    }

    const errorCodes = Array.isArray(outcome['error-codes'])
      ? outcome['error-codes'].join(', ')
      : 'challenge-failed';

    return {
      success: false,
      error: `Security challenge verification failed (${errorCodes}). Please try again.`,
    };
  } catch (err) {
    console.error('Cloudflare Turnstile verification error:', err);
    return {
      success: false,
      error: 'Security challenge server error. Please try again.',
    };
  }
}
