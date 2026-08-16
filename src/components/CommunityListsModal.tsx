'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { COMMUNITY_LISTS } from '@/lib/community-lists';
import { faviconUrl } from '@/lib/utils';

interface CommunityListsModalProps {
  isOpen: boolean;
  enabledListIds: string[];
  onClose: () => void;
  onToggleList: (id: string) => void;
}

export function CommunityListsModal({
  isOpen,
  enabledListIds,
  onClose,
  onToggleList,
}: CommunityListsModalProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setActiveCategory('All');
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

  const categories = useMemo(() => {
    const set = new Set<string>();
    COMMUNITY_LISTS.forEach((l) => set.add(l.category));
    return ['All', ...Array.from(set)];
  }, []);

  const filteredLists = useMemo(() => {
    return COMMUNITY_LISTS.filter((list) => {
      const matchesCategory =
        activeCategory === 'All' || list.category === activeCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        list.title.toLowerCase().includes(q) ||
        list.description.toLowerCase().includes(q) ||
        list.links.some(
          (link) =>
            link.name.toLowerCase().includes(q) ||
            link.url.toLowerCase().includes(q) ||
            (link.description && link.description.toLowerCase().includes(q))
        );

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="overlay show"
      id="communityListsOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="communityModalTitle"
    >
      <div className="modal modal-lg community-modal">
        <div className="auth-header">
          <div className="auth-brand">
            <span className="auth-brand-icon">🌐</span>
            <span className="mono auth-brand-name">Curated Community Lists</span>
          </div>
          <button
            type="button"
            className="close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        <div className="community-modal-intro">
          <h2 id="communityModalTitle" className="community-modal-heading">
            Discover Public Topic Stacks
          </h2>
          <p className="community-modal-sub">
            Public collections maintained by the app. Add them as dedicated rows to your dashboard without counting against your 500 personal bookmark limit.
          </p>
        </div>

        {/* Search and Category Filters */}
        <div className="community-modal-toolbar">
          <div className="community-search-box">
            <span className="search-icon">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              className="mono"
              placeholder="Search community lists and tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn mono"
                onClick={() => setSearchQuery('')}
              >
                &times;
              </button>
            )}
          </div>

          <div className="tag-row mono" style={{ marginTop: '10px', gap: '6px' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`tag-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lists Grid */}
        <div className="community-lists-grid">
          {filteredLists.length === 0 ? (
            <div className="no-sites mono" style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: 'var(--text-faint)' }}>
              No community lists found matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredLists.map((list) => {
              const isEnabled = enabledListIds.includes(list.id);
              return (
                <div
                  key={list.id}
                  className={`community-list-card ${isEnabled ? 'is-enabled' : ''}`}
                >
                  <div className="community-list-card-header">
                    <div className="community-list-card-title-wrap">
                      <span className="community-list-card-icon">{list.icon || '🌐'}</span>
                      <div>
                        <div className="community-list-card-title">{list.title}</div>
                        <div className="community-list-card-meta mono">
                          <span className="community-cat-pill">{list.category}</span>
                          {list.badge && (
                            <span className="community-badge-sm">{list.badge}</span>
                          )}
                          <span className="community-meta-count">{list.links.length} sites</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`btn btn-sm mono community-toggle-btn ${
                        isEnabled ? 'btn-active-toggle' : 'btn-primary'
                      }`}
                      onClick={() => onToggleList(list.id)}
                    >
                      {isEnabled ? '✓ Added' : '+ Add Row'}
                    </button>
                  </div>

                  <p className="community-list-card-desc">{list.description}</p>

                  <div className="community-list-links-preview">
                    {list.links.map((link) => (
                      <span key={link.url} className="community-link-chip mono" title={link.url}>
                        <img
                          src={faviconUrl(link.url)}
                          alt=""
                          width={14}
                          height={14}
                          className="chip-fav"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <span>{link.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button type="button" className="btn mono" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
