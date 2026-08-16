'use client';

import { useState, useEffect } from 'react';

export function useClock() {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState({
    hours: '00',
    minutes: '00',
    seconds: '00',
    dateRow: '—',
    greeting: 'Welcome',
  });

  useEffect(() => {
    setMounted(true);

    const updateClock = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();

      let greetingText = 'Good night';
      if (h < 5) greetingText = 'Still up';
      else if (h < 12) greetingText = 'Good morning';
      else if (h < 17) greetingText = 'Good afternoon';
      else if (h < 21) greetingText = 'Good evening';

      setTime({
        hours: String(h).padStart(2, '0'),
        minutes: String(m).padStart(2, '0'),
        seconds: String(s).padStart(2, '0'),
        dateRow: now.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }),
        greeting: greetingText,
      });
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    ...time,
    isMounted: mounted,
  };
}
