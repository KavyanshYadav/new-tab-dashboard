import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import {
  getUserShortcuts,
  addUserShortcut,
  deleteUserShortcut,
  setAllUserShortcuts,
  findUser,
} from '@/lib/server-storage';
import { getClientIp, checkApiReadRateLimit, checkApiWriteRateLimit } from '@/lib/rate-limiter';

export async function OPTIONS() {
  return handleOptions();
}

function extractApiKey(req: NextRequest): string | null {
  const apiKey =
    req.headers.get('x-api-key') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    req.nextUrl.searchParams.get('key');

  return apiKey ? apiKey.trim() : null;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const apiKey = extractApiKey(req);
  const rateKey = apiKey || ip;

  const rateCheck = checkApiReadRateLimit(rateKey);
  if (!rateCheck.allowed) {
    const res = jsonResponse(
      { error: `Rate limit exceeded. Please wait ${rateCheck.resetSec} seconds.` },
      429
    );
    res.headers.set('Retry-After', String(rateCheck.resetSec));
    return res;
  }

  if (!apiKey) {
    return jsonResponse({ error: 'Unauthorized: Valid API key is required (x-api-key header).' }, 401);
  }

  const user = await findUser({ apiKey });
  if (!user) {
    return jsonResponse({ error: 'Unauthorized: Invalid API key or account not found.' }, 401);
  }


  let shortcuts = (await getUserShortcuts(user.userId)) || [];
  const onlyPinned = req.nextUrl.searchParams.get('pinned') === 'true';
  if (onlyPinned) {
    shortcuts = shortcuts.filter((s) => s.pinned);
  }

  return jsonResponse({
    userId: user.userId,
    username: user.username,
    apiKey: user.apiKey,
    shortcuts,
    total: shortcuts.length,
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const apiKey = extractApiKey(req);
  const rateKey = apiKey || ip;

  const rateCheck = checkApiWriteRateLimit(rateKey);
  if (!rateCheck.allowed) {
    const res = jsonResponse(
      { error: `Write rate limit exceeded. Please wait ${rateCheck.resetSec} seconds.` },
      429
    );
    res.headers.set('Retry-After', String(rateCheck.resetSec));
    return res;
  }

  if (!apiKey) {
    return jsonResponse({ error: 'Unauthorized: Valid API key is required (x-api-key header).' }, 401);
  }

  const user = await findUser({ apiKey });
  if (!user) {
    return jsonResponse({ error: 'Unauthorized: Invalid API key or account not found.' }, 401);
  }

  try {
    const body = await req.json();
    if (!body || !body.url) {
      return jsonResponse({ error: 'Missing "url" in request body' }, 400);
    }

    const result = await addUserShortcut(user.userId, {
      url: body.url,
      name: body.name,
      category: body.category,
      pinned: body.pinned,
    });

    if (!result.success) {
      return jsonResponse({ error: result.error || 'Failed to add shortcut' }, 400);
    }

    return jsonResponse(
      {
        success: true,
        userId: user.userId,
        shortcut: result.shortcut,
        message: 'Shortcut added successfully',
      },
      201
    );
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }
}

export async function DELETE(req: NextRequest) {
  const ip = getClientIp(req);
  const apiKey = extractApiKey(req);
  const rateKey = apiKey || ip;

  const rateCheck = checkApiWriteRateLimit(rateKey);
  if (!rateCheck.allowed) {
    const res = jsonResponse(
      { error: `Write rate limit exceeded. Please wait ${rateCheck.resetSec} seconds.` },
      429
    );
    res.headers.set('Retry-After', String(rateCheck.resetSec));
    return res;
  }

  if (!apiKey) {
    return jsonResponse({ error: 'Unauthorized: Valid API key is required (x-api-key header).' }, 401);
  }

  const user = await findUser({ apiKey });
  if (!user) {
    return jsonResponse({ error: 'Unauthorized: Invalid API key or account not found.' }, 401);
  }

  try {
    let id = req.nextUrl.searchParams.get('id');
    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id) {
      return jsonResponse({ error: 'Missing shortcut ID' }, 400);
    }

    const deleted = await deleteUserShortcut(user.userId, id);
    if (!deleted) {
      return jsonResponse({ error: 'Shortcut not found or could not be deleted' }, 404);
    }

    return jsonResponse({
      success: true,
      userId: user.userId,
      message: 'Shortcut removed',
    });
  } catch {
    return jsonResponse({ error: 'Server error processing deletion' }, 500);
  }
}

export async function PUT(req: NextRequest) {
  const ip = getClientIp(req);
  const apiKey = extractApiKey(req);
  const rateKey = apiKey || ip;

  const rateCheck = checkApiWriteRateLimit(rateKey);
  if (!rateCheck.allowed) {
    const res = jsonResponse(
      { error: `Write rate limit exceeded. Please wait ${rateCheck.resetSec} seconds.` },
      429
    );
    res.headers.set('Retry-After', String(rateCheck.resetSec));
    return res;
  }

  if (!apiKey) {
    return jsonResponse({ error: 'Unauthorized: Valid API key is required (x-api-key header).' }, 401);
  }

  const user = await findUser({ apiKey });
  if (!user) {
    return jsonResponse({ error: 'Unauthorized: Invalid API key or account not found.' }, 401);
  }


  try {
    const body = await req.json();
    if (!Array.isArray(body?.shortcuts)) {
      return jsonResponse({ error: 'Body must contain shortcuts array' }, 400);
    }

    await setAllUserShortcuts(user.userId, body.shortcuts);

    return jsonResponse({
      success: true,
      userId: user.userId,
      count: body.shortcuts.length,
    });
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }
}
