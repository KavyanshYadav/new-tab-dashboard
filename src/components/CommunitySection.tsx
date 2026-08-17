'use client';

import React from 'react';
import { COMMUNITY_LISTS } from '@/lib/community-lists';
import { faviconUrl } from '@/lib/utils';

interface CommunitySectionProps {
  enabledListIds: string[];
  onRemoveList: (id: string) => void;
  onOpenCommunityModal: () => void;
}

export function CommunitySection({
  enabledListIds,
  onRemoveList,
  onOpenCommunityModal,
}: CommunitySectionProps) {
  const activeLists = COMMUNITY_LISTS.filter((list) =>
    enabledListIds.includes(list.id)
  );

  if (activeLists.length === 0) {
    return (
      <div className="community-empty-banner">
        <div className="community-empty-content">
          <span className="community-empty-icon">🌐</span>
          <div>
            <div className="community-empty-title">Curated Community Lists</div>
            <div className="community-empty-desc">
              Explore public tool stacks for Top AI Tools, Web Dev, Productivity, and more.
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary mono btn-sm"
          onClick={onOpenCommunityModal}
        >
          Browse Lists →
        </button>
      </div>
    );
  }

  return (
    <div className="community-sections-container">
      {activeLists.map((list) => (
        <section key={list.id} className="community-row-section">
          <div className="section-head">
            <div className="section-title-wrap">
              <span className="eyebrow mono">
                {list.icon || '🌐'} {list.title}
              </span>
              <span className="count mono">{list.links.length}</span>
              <span className="community-cat-pill mono">{list.category}</span>
              {list.badge && (
                <span className="community-badge-pill mono">{list.badge}</span>
              )}
            </div>

            <button
              type="button"
              className="community-dismiss-btn mono"
              onClick={() => onRemoveList(list.id)}
              title="Hide this community list from your dashboard"
              aria-label={`Remove ${list.title} from dashboard`}
            >
              &times; remove
            </button>
          </div>

          <div className="grid">
            {list.links.map((link) => {
              const fav = faviconUrl(link.url);
              return (
                <a
                  key={link.url}
                  href={link.url}
                  className="site-card"
                  title={link.description ? `${link.name} — ${link.description}` : link.name}
                  target="_self"
                  rel="noreferrer"
                >
                  <div className="favicon-box">
                    <img
                      src={fav}
                      alt=""
                      width={20}
                      height={20}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                      }}
                    />
                    <div className="favicon-fallback mono" style={{ display: 'none' }}>
                      {link.name.slice(0, 1).toUpperCase()}
                    </div>
                  </div>
                  <div className="site-name">{link.name}</div>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
