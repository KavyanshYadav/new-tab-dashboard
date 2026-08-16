'use client';

import React, { useEffect, useRef } from 'react';

// User's Cloudflare Turnstile Site Key
export const DEFAULT_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
  process.env.TURNSTILE_SITE_KEY ||
  '0x4AAAAAAER8PxGtcCqrsblF';

interface TurnstileWidgetProps {
  siteKey?: string;
  action?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: 'dark' | 'light' | 'auto';
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          action?: string;
          theme?: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export function TurnstileWidget({
  siteKey = DEFAULT_SITE_KEY,
  action,
  onVerify,
  onExpire,
  onError,
  theme = 'dark',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const isRenderedRef = useRef(false);

  // Keep callback refs stable so parent re-renders / typing in input fields never trigger widget remounts
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let isCancelled = false;

    const renderWidget = () => {
      if (
        isCancelled ||
        !containerRef.current ||
        !window.turnstile ||
        isRenderedRef.current
      ) {
        return;
      }

      try {
        isRenderedRef.current = true;
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action: action,
          theme: theme,
          callback: (token: string) => {
            if (!isCancelled && onVerifyRef.current) {
              onVerifyRef.current(token);
            }
          },
          'expired-callback': () => {
            if (!isCancelled && onExpireRef.current) {
              onExpireRef.current();
            }
          },
          'error-callback': () => {
            if (!isCancelled && onErrorRef.current) {
              onErrorRef.current();
            }
          },
        });
        widgetIdRef.current = id;
      } catch (err) {
        console.warn('Turnstile render exception:', err);
      }
    };

    // Load Cloudflare Turnstile script if not already present
    const SCRIPT_ID = 'cf-turnstile-script';
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        renderWidget();
      };
      document.head.appendChild(script);
    } else {
      if (window.turnstile) {
        renderWidget();
      } else {
        script.addEventListener('load', renderWidget, { once: true });
      }
    }

    return () => {
      isCancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
        isRenderedRef.current = false;
      }
    };
  }, [siteKey, action, theme]); // Only re-mount if siteKey/action/theme truly changes!

  return (
    <div
      className="turnstile-wrapper"
      style={{
        margin: '14px 0',
        minHeight: '65px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div ref={containerRef} />
    </div>
  );
}
