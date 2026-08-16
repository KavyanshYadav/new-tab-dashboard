import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  const siteKey =
    process.env.TURNSTILE_SITE_KEY ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    '0x4AAAAAAER8PxGtcCqrsblF';

  return jsonResponse({
    siteKey,
  });
}
