'use client';

import React from 'react';
import { Shortcut } from '@/lib/types';
import { fullUrl } from '@/lib/utils';
import { ShortcutCard } from './ShortcutCard';

interface ShortcutsSectionProps {
  totalCount: number;
  filteredSites: Shortcut[];
  allSites: Shortcut[];
  categories: string[];
  activeTag: string;
  onSelectTag: (tag: string) => void;
  onOpenAddModal: () => void;
  onEdit: (site: Shortcut) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onClickSite: (id: string) => void;
}

export function ShortcutsSection({
  totalCount,
  filteredSites,
  allSites,
  categories,
  activeTag,
  onSelectTag,
  onOpenAddModal,
  onEdit,
  onDelete,
  onTogglePin,
  onClickSite,
}: ShortcutsSectionProps) {
  const handleOpenAll = () => {
    const matching = allSites.filter((s) => s.category === activeTag);
    matching.forEach((s) => {
      window.open(fullUrl(s.url), '_blank', 'noopener,noreferrer');
    });
  };

  const matchingCategoryCount = allSites.filter((s) => s.category === activeTag).length;

  return (
    <section className="section" aria-label="Shortcuts">
      <div className="section-head">
        <div className="eyebrow mono">
          Shortcuts <span className="count mono" id="siteCount">{totalCount}</span>
        </div>
      </div>

      {categories.length > 1 && (
        <div className="tag-row" id="tagRow">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`tag-btn mono ${activeTag === cat ? 'active' : ''}`}
              onClick={() => onSelectTag(cat)}
            >
              {cat}
            </button>
          ))}

          {activeTag !== 'All' && matchingCategoryCount > 0 && (
            <button
              type="button"
              className="open-all-btn mono"
              onClick={handleOpenAll}
              title={`Open all ${matchingCategoryCount} links in separate tabs`}
            >
              open all {matchingCategoryCount} ↗
            </button>
          )}
        </div>
      )}

      {totalCount === 0 ? (
        <div className="empty-wrap">
          <div className="empty-state">
            No shortcuts yet — <b>add your first site</b> or browse popular sites to get started.
          </div>
          <button
            type="button"
            className="add-card"
            style={{ marginTop: '14px' }}
            onClick={onOpenAddModal}
            aria-label="Add new shortcut"
          >
            <span className="plus">+</span>
            <span className="lbl mono">ADD</span>
          </button>
        </div>
      ) : (
        <div className="grid" id="grid" style={{ marginTop: '14px' }}>
          {filteredSites.map((site) => (
            <ShortcutCard
              key={site.id}
              site={site}
              onEdit={onEdit}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
              onClickSite={onClickSite}
            />
          ))}

          <button
            type="button"
            className="add-card"
            onClick={onOpenAddModal}
            aria-label="Add new shortcut"
          >
            <span className="plus">+</span>
            <span className="lbl mono">ADD</span>
          </button>
        </div>
      )}
    </section>
  );
}
