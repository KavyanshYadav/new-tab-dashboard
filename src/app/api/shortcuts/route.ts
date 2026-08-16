import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import {
  getUserShortcuts,
  addUserShortcut,
  deleteUserShortcut,
  setAllUserShortcuts,
  getOrCreateUser,
} from '@/lib/server-storage';

export async function OPTIONS() {
  return handleOptions();
}

function getApiKeyFromRequest(req: NextRequest): string | null {
  const headerKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (headerKey) return headerKey;
  return req.nextUrl.searchParams.get('key');
}

export async function GET(req: NextRequest) {
  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey) {
    return jsonResponse({ error: 'Missing API key in x-api-key header or key query param' }, 401);
  }

  const user = getOrCreateUser(apiKey);
  const shortcuts = getUserShortcuts(user.apiKey) || [];
  return jsonResponse({
    shortcuts,
    total: shortcuts.length,
    apiKey: user.apiKey,
  });
}

export async function POST(req: NextRequest) {
  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey) {
    return jsonResponse({ error: 'Missing API key in x-api-key header' }, 401);
  }

  try {
    const body = await req.json();
    if (!body || !body.url) {
      return jsonResponse({ error: 'Missing "url" in request body' }, 400);
    }

    const result = addUserShortcut(apiKey, {
      url: body.url,
      name: body.name,
      category: body.category,
      pinned: body.pinned,
    });

    if (!result.success) {
      return jsonResponse({ error: result.error || 'Failed to add shortcut' }, 400);
    }

    return jsonResponse({
      success: true,
      shortcut: result.shortcut,
      message: 'Shortcut added successfully',
    }, 201);
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }
}

export async function DELETE(req: NextRequest) {
  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey) {
    return jsonResponse({ error: 'Missing API key in x-api-key header' }, 401);
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

    const deleted = deleteUserShortcut(apiKey, id);
    if (!deleted) {
      return jsonResponse({ error: 'Shortcut not found or could not be deleted' }, 404);
    }

    return jsonResponse({ success: true, message: 'Shortcut removed' });
  } catch {
    return jsonResponse({ error: 'Server error processing deletion' }, 500);
  }
}

export async function PUT(req: NextRequest) {
  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey) {
    return jsonResponse({ error: 'Missing API key in x-api-key header' }, 401);
  }

  try {
    const body = await req.json();
    if (!Array.isArray(body?.shortcuts)) {
      return jsonResponse({ error: 'Body must contain shortcuts array' }, 400);
    }

    setAllUserShortcuts(apiKey, body.shortcuts);
    return jsonResponse({ success: true, count: body.shortcuts.length });
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }
}
