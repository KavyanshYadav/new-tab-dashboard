'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PopularSite, Shortcut } from '@/lib/types';
import { POPULAR_SITES } from '@/lib/constants';
import { faviconUrl, hostname } from '@/lib/utils';

interface PopularSitesModalProps {
  isOpen: boolean;
  userSites: Shortcut[];
  onClose: () => void;
  onAddSite: (site: PopularSite) => void;
}

export function PopularSitesModal({
  isOpen,
  userSites,
  onClose,
  onAddSite,
}: PopularSitesModalProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFilterQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const isAlreadyAdded = useMemo(() => {
    const userHostnames = new Set(userSites.map((s) => hostname(s.url).toLowerCase()));
    return (siteUrl: string) => userHostnames.has(hostname(siteUrl).toLowerCase());
  }, [userSites]);

  const filteredGroups = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return POPULAR_SITES;

    return POPULAR_SITES.map((group) => ({
      group: group.group,
      items: group.items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.url.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      ),
    })).filter((group) => group.items.length > 0);
  }, [filterQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="overlay show"
      id="popOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="popTitle"
    >
      <div className="modal modal-lg">
        <h3>
          <span id="popTitle">Popular sites</span>
          <button
            type="button"
            className="close"
            id="popClose"
            onClick={onClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </h3>

        <input
          ref={searchInputRef}
          type="text"
          className="pop-search"
          id="popSearch"
          placeholder="Filter by name or category…"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
        />

        <div className="pop-body" id="popBody">
          {filteredGroups.length === 0 ? (
            <div className="empty-state">No matches for &ldquo;{filterQuery}&rdquo;</div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.group} className="pop-group">
                <div className="pop-group-title mono">{group.group}</div>
                <div className="pop-list">
                  {group.items.map((item) => {
                    const added = isAlreadyAdded(item.url);
                    return (
                      <div key={item.url} className="pop-row">
                        <div className="pop-favicon">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={faviconUrl(item.url)}
                            alt=""
                            width={14}
                            height={14}
                            loading="lazy"
                          />
                        </div>
                        <div className="pop-name">{item.name}</div>
                        <div className="pop-domain">{item.url}</div>
                        <button
                          type="button"
                          className={`pop-add-btn mono ${added ? 'added' : ''}`}
                          disabled={added}
                          onClick={() => onAddSite(item)}
                        >
                          {added ? 'Added ✓' : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
