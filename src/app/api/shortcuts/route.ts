import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import {
  getUserShortcuts,
  addUserShortcut,
  deleteUserShortcut,
  setAllUserShortcuts,
  findUser,
} from '@/lib/server-storage';

export async function OPTIONS() {
  return handleOptions();
}

function extractUserCredentials(req: NextRequest) {
  const userId = req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId');
  const apiKey =
    req.headers.get('x-api-key') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    req.nextUrl.searchParams.get('key');

  return { userId, apiKey };
}

export async function GET(req: NextRequest) {
  const { userId, apiKey } = extractUserCredentials(req);
  if (!userId && !apiKey) {
    return jsonResponse({ error: 'Unauthorized: Missing API key or User ID. Only signed-in users can use the sync API.' }, 401);
  }

  const user = findUser({ userId, apiKey });
  if (!user) {
    return jsonResponse({ error: 'Unauthorized: User account not found. Please register or sign in.' }, 401);
  }

  const shortcuts = getUserShortcuts(user.userId) || [];
  return jsonResponse({
    userId: user.userId,
    username: user.username,
    apiKey: user.apiKey,
    shortcuts,
    total: shortcuts.length,
  });
}

export async function POST(req: NextRequest) {
  const { userId, apiKey } = extractUserCredentials(req);
  if (!userId && !apiKey) {
    return jsonResponse({ error: 'Unauthorized: Missing API key or User ID. Only signed-in users can use the sync API.' }, 401);
  }

  const user = findUser({ userId, apiKey });
  if (!user) {
    return jsonResponse({ error: 'Unauthorized: User account not found. Please register or sign in.' }, 401);
  }

  try {
    const body = await req.json();
    if (!body || !body.url) {
      return jsonResponse({ error: 'Missing "url" in request body' }, 400);
    }

    const result = addUserShortcut(user.userId, {
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
      userId: user.userId,
      shortcut: result.shortcut,
      message: 'Shortcut added successfully',
    }, 201);
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }
}

export async function DELETE(req: NextRequest) {
  const { userId, apiKey } = extractUserCredentials(req);
  if (!userId && !apiKey) {
    return jsonResponse({ error: 'Unauthorized: Missing API key or User ID. Only signed-in users can use the sync API.' }, 401);
  }

  const user = findUser({ userId, apiKey });
  if (!user) {
    return jsonResponse({ error: 'Unauthorized: User account not found. Please register or sign in.' }, 401);
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

    const deleted = deleteUserShortcut(user.userId, id);
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
  const { userId, apiKey } = extractUserCredentials(req);
  if (!userId && !apiKey) {
    return jsonResponse({ error: 'Unauthorized: Missing API key or User ID. Only signed-in users can use the sync API.' }, 401);
  }

  const user = findUser({ userId, apiKey });
  if (!user) {
    return jsonResponse({ error: 'Unauthorized: User account not found. Please register or sign in.' }, 401);
  }

  try {
    const body = await req.json();
    if (!Array.isArray(body?.shortcuts)) {
      return jsonResponse({ error: 'Body must contain shortcuts array' }, 400);
    }

    setAllUserShortcuts(user.userId, body.shortcuts);

    return jsonResponse({
      success: true,
      userId: user.userId,
      count: body.shortcuts.length,
    });
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }
}
