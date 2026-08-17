import { NextRequest } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

interface FailedLoginRecord {
  count: number;
  lockedUntil: number;
}

// In-memory sliding window caches
const rateLimitStore: Record<string, RateLimitRecord> = {};
const failedLoginStore: Record<string, FailedLoginRecord> = {};

// Clean up old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = Date.now();

function performCleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  // Purge rate limit logs older than 15 minutes
  const maxAge = 15 * 60 * 1000;
  for (const key in rateLimitStore) {
    rateLimitStore[key].timestamps = rateLimitStore[key].timestamps.filter(
      (ts) => now - ts < maxAge
    );
    if (rateLimitStore[key].timestamps.length === 0) {
      delete rateLimitStore[key];
    }
  }

  // Purge expired login lockouts
  for (const key in failedLoginStore) {
    if (failedLoginStore[key].lockedUntil < now && failedLoginStore[key].count === 0) {
      delete failedLoginStore[key];
    }
  }
}

export function getClientIp(req: NextRequest): string {
  // Cloudflare trusted client IP header
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  // Standard reverse proxy headers
  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded && forwarded.trim()) {
    const candidate = forwarded.split(',')[0].trim();
    if (candidate) return candidate;
  }

  return '127.0.0.1';
}


export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetSec: number } {
  performCleanup();
  const now = Date.now();

  if (!rateLimitStore[key]) {
    rateLimitStore[key] = { timestamps: [] };
  }

  // Remove timestamps outside the sliding window
  rateLimitStore[key].timestamps = rateLimitStore[key].timestamps.filter(
    (ts) => now - ts < windowMs
  );

  const currentCount = rateLimitStore[key].timestamps.length;
  const oldestTimestamp = rateLimitStore[key].timestamps[0] || now;
  const resetSec = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));

  if (currentCount >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetSec,
    };
  }

  rateLimitStore[key].timestamps.push(now);
  return {
    allowed: true,
    remaining: limit - currentCount - 1,
    resetSec,
  };
}

// 1. Register Rate Limiter: Max 5 accounts per IP per 15 minutes
export function checkRegisterRateLimit(ip: string) {
  return checkRateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
}

// 2. Login IP Rate Limiter: Max 10 attempts per IP per 5 minutes
export function checkLoginIpRateLimit(ip: string) {
  return checkRateLimit(`login_ip:${ip}`, 10, 5 * 60 * 1000);
}

// 3. Account-Level Brute Force Protection (Max 5 consecutive failures &rarr; 15 min lock)
export function checkAccountLockout(identifier: string): { locked: boolean; remainingSec: number } {
  const cleanId = identifier.trim().toLowerCase();
  const now = Date.now();
  const record = failedLoginStore[cleanId];

  if (record && record.lockedUntil > now) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    return { locked: true, remainingSec };
  }

  return { locked: false, remainingSec: 0 };
}

export function recordFailedLogin(identifier: string) {
  const cleanId = identifier.trim().toLowerCase();
  const now = Date.now();
  const record = failedLoginStore[cleanId] || { count: 0, lockedUntil: 0 };

  record.count += 1;
  if (record.count >= 5) {
    // Lock account for 15 minutes after 5 consecutive failures
    record.lockedUntil = now + 15 * 60 * 1000;
  }
  failedLoginStore[cleanId] = record;
}

export function resetFailedLogin(identifier: string) {
  const cleanId = identifier.trim().toLowerCase();
  delete failedLoginStore[cleanId];
}

// 4. API Read Rate Limiter: Max 120 req / 1 min
export function checkApiReadRateLimit(keyOrIp: string) {
  return checkRateLimit(`api_read:${keyOrIp}`, 120, 60 * 1000);
}

// 5. API Write Rate Limiter: Max 30 req / 1 min
export function checkApiWriteRateLimit(keyOrIp: string) {
  return checkRateLimit(`api_write:${keyOrIp}`, 30, 60 * 1000);
}

// 6. API Key Regeneration Rate Limiter: Max 3 req / 10 min
export function checkKeyRegenRateLimit(userId: string) {
  return checkRateLimit(`key_regen:${userId}`, 3, 10 * 60 * 1000);
}
