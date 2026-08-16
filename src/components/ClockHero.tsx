'use client';

import React, { useState } from 'react';
import { useClock } from '@/hooks/useClock';
import { SEARCH_ENGINES } from '@/lib/constants';
import { fullUrl, isUrlLike } from '@/lib/utils';

interface ClockHeroProps {
  engineIndex: number;
  onEngineChange: (index: number) => void;
}

export function ClockHero({ engineIndex, onEngineChange }: ClockHeroProps) {
  const { hours, minutes, seconds, dateRow, greeting, isMounted } = useClock();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (isUrlLike(query)) {
      window.location.href = fullUrl(query);
    } else {
      const activeEngine = SEARCH_ENGINES[engineIndex] || SEARCH_ENGINES[0];
      window.location.href = activeEngine.url + encodeURIComponent(query);
    }
  };

  return (
    <header className="hero" aria-label="Header and Search">
      <div className="greeting mono" id="greeting">
        {isMounted ? greeting : 'Welcome'}
      </div>

      <div className="clock mono" id="clock" aria-live="off">
        {isMounted ? (
          <>
            {hours}:{minutes}
            <span className="secs">{seconds}</span>
          </>
        ) : (
          <>
            00:00<span className="secs">00</span>
          </>
        )}
      </div>

      <div className="date-row" id="dateRow">
        {isMounted ? dateRow : '—'}
      </div>

      <div className="search-wrap">
        <select
          className="engine-select mono"
          id="engineSelect"
          value={engineIndex}
          onChange={(e) => onEngineChange(Number(e.target.value))}
          aria-label="Select Search Engine"
        >
          {SEARCH_ENGINES.map((engine, idx) => (
            <option key={engine.name} value={idx}>
              {engine.name}
            </option>
          ))}
        </select>

        <form className="search-form" id="searchForm" onSubmit={handleSearchSubmit}>
          <input
            className="search-input"
            id="searchInput"
            type="text"
            placeholder="Search or paste a URL and hit enter…"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      <div className="kbd-hint mono">
        Vimium tips — <kbd>gi</kbd> jumps here · <kbd>f</kbd> hints every shortcut · <kbd>F</kbd> opens in a new tab
      </div>
    </header>
  );
}
