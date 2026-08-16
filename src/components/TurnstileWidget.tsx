'use client';

import React, { useEffect, useRef, useState } from 'react';

const DEFAULT_TEST_SITE_KEY = '1x00000000000000000000AA';

interface TurnstileWidgetProps {
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
  onVerify,
  onExpire,
  onError,
  theme = 'dark',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [siteKey, setSiteKey] = useState<string>(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || DEFAULT_TEST_SITE_KEY
  );

  // Fetch site key from server config endpoint so users don't need NEXT_PUBLIC_ in Vercel
  useEffect(() => {
    fetch('/api/auth/turnstile-config')
      .then((res) => res.json())
      .then((data) => {
        if (data.siteKey) {
          setSiteKey(data.siteKey);
        }
      })
      .catch((e) => console.warn('Turnstile config load note:', e));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile || !siteKey) return;

      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: theme,
          callback: (token: string) => {
            if (isMounted) onVerify(token);
          },
          'expired-callback': () => {
            if (isMounted && onExpire) onExpire();
          },
          'error-callback': () => {
            if (isMounted && onError) onError();
          },
        });
      } catch (e) {
        console.warn('Turnstile render note:', e);
      }
    };

    const existingScript = document.getElementById('cf-turnstile-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
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
        existingScript.addEventListener('load', renderWidget);
      }
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }
    };
  }, [siteKey, onVerify, onExpire, onError, theme]);

  return (
    <div
      className="turnstile-container"
      style={{
        margin: '12px 0',
        minHeight: '65px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div ref={containerRef} />
    </div>
  );
}
