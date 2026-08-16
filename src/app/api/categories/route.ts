import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { getUserCategories } from '@/lib/server-storage';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key');
  if (!apiKey) {
    return jsonResponse({ error: 'Missing API key' }, 401);
  }

  const categories = getUserCategories(apiKey);
  return jsonResponse({ categories });
}
