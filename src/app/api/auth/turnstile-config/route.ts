import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  // Read server environment variable (no NEXT_PUBLIC_ required in Vercel)
  const siteKey =
    process.env.TURNSTILE_SITE_KEY ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    '1x00000000000000000000AA';

  return jsonResponse({
    siteKey,
  });
}
