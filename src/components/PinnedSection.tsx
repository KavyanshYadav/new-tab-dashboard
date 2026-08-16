'use client';

import React from 'react';
import { Shortcut } from '@/lib/types';
import { ShortcutCard } from './ShortcutCard';

interface PinnedSectionProps {
  pinnedSites: Shortcut[];
  onEdit: (site: Shortcut) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onClickSite: (id: string) => void;
}

export function PinnedSection({
  pinnedSites,
  onEdit,
  onDelete,
  onTogglePin,
  onClickSite,
}: PinnedSectionProps) {
  if (pinnedSites.length === 0) {
    return null;
  }

  return (
    <section className="section" id="pinnedSection" aria-label="Pinned Shortcuts">
      <div className="section-head">
        <div className="eyebrow mono">
          Pinned <span className="count mono" id="pinnedCount">{pinnedSites.length}</span>
        </div>
      </div>
      <div className="grid" id="pinnedGrid">
        {pinnedSites.map((site) => (
          <ShortcutCard
            key={site.id}
            site={site}
            onEdit={onEdit}
            onDelete={onDelete}
            onTogglePin={onTogglePin}
            onClickSite={onClickSite}
          />
        ))}
      </div>
    </section>
  );
}
