'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Shortcut } from '@/lib/types';
import { hostname } from '@/lib/utils';

interface AddEditModalProps {
  isOpen: boolean;
  editingSite: Shortcut | null;
  categories: string[];
  onClose: () => void;
  onSave: (data: { url: string; name?: string; category?: string; pinned?: boolean }) => void;
  onDelete?: (id: string) => void;
}

export function AddEditModal({
  isOpen,
  editingSite,
  categories,
  onClose,
  onSave,
  onDelete,
}: AddEditModalProps) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [pinned, setPinned] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingSite) {
        setUrl(editingSite.url || '');
        setName(editingSite.name || '');
        setCategory(editingSite.category || '');
        setPinned(!!editingSite.pinned);
      } else {
        setUrl('');
        setName('');
        setCategory('');
        setPinned(false);
      }
      setTimeout(() => {
        urlInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, editingSite]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    onSave({
      url: cleanUrl,
      name: name.trim() || hostname(cleanUrl),
      category: category.trim() || undefined,
      pinned,
    });
  };

  const handleDelete = () => {
    if (editingSite && onDelete) {
      onDelete(editingSite.id);
      onClose();
    }
  };

  const categoryOptions = categories.filter((c) => c !== 'All');

  return (
    <div
      className="overlay show"
      id="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalTitle"
    >
      <div className="modal">
        <h3>
          <span id="modalTitle">{editingSite ? 'Edit shortcut' : 'Add shortcut'}</span>
          <button
            type="button"
            className="close"
            id="modalClose"
            onClick={onClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="mono" htmlFor="siteUrl">
              URL
            </label>
            <input
              ref={urlInputRef}
              type="text"
              id="siteUrl"
              placeholder="github.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="mono" htmlFor="siteName">
              Name
            </label>
            <input
              type="text"
              id="siteName"
              placeholder={url ? hostname(url) : 'GitHub (optional, auto-filled)'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label className="mono" htmlFor="siteCategory">
                Category
              </label>
              <input
                type="text"
                id="siteCategory"
                placeholder="Dev"
                list="catList"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <datalist id="catList">
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="checkbox-row">
            <input
              type="checkbox"
              id="sitePinned"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            <label htmlFor="sitePinned">Pin to top</label>
          </div>

          <div className="modal-actions">
            {editingSite && (
              <button
                type="button"
                className="btn btn-danger"
                id="deleteFromModal"
                onClick={handleDelete}
              >
                Delete
              </button>
            )}
            <button type="submit" className="btn btn-primary" id="saveSite">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
