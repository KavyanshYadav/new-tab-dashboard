'use client';

import React, { useState } from 'react';
import { Shortcut } from '@/lib/types';
import { faviconUrl, fullUrl } from '@/lib/utils';

interface ShortcutCardProps {
  site: Shortcut;
  onEdit: (site: Shortcut) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onClickSite: (id: string) => void;
}

export function ShortcutCard({
  site,
  onEdit,
  onDelete,
  onTogglePin,
  onClickSite,
}: ShortcutCardProps) {
  const [imageError, setImageError] = useState(false);
  const fallbackLetter = (site.name || '?')[0].toUpperCase();

  const handleLinkClick = () => {
    onClickSite(site.id);
  };

  return (
    <div className="site-tile">
      {site.pinned && <div className="pin-badge" title="Pinned">★</div>}

      <a
        className="site-card"
        href={fullUrl(site.url)}
        data-id={site.id}
        onClick={handleLinkClick}
      >
        <div className="favicon-box">
          {!imageError ? (
            // Using standard img tag for dynamic external favicon domain fetching with onError fallback
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={faviconUrl(site.url)}
              alt=""
              width={20}
              height={20}
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="favicon-fallback mono">{fallbackLetter}</span>
          )}
        </div>
        <div className="site-name" title={site.name}>
          {site.name}
        </div>
      </a>

      <div className="tile-actions">
        <button
          type="button"
          className={`tile-icon-btn star-btn ${site.pinned ? 'pinned' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePin(site.id);
          }}
          title={site.pinned ? 'Unpin' : 'Pin to top'}
          aria-label={site.pinned ? 'Unpin shortcut' : 'Pin shortcut'}
        >
          {site.pinned ? '★' : '☆'}
        </button>

        <button
          type="button"
          className="tile-icon-btn edit-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(site);
          }}
          title="Edit shortcut"
          aria-label="Edit shortcut"
        >
          ✎
        </button>

        <button
          type="button"
          className="tile-icon-btn del-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(site.id);
          }}
          title="Remove shortcut"
          aria-label="Remove shortcut"
        >
          ×
        </button>
      </div>
    </div>
  );
}
