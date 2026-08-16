'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { Shortcut, PopularSite } from '@/lib/types';
import { ClockHero } from '@/components/ClockHero';
import { PinnedSection } from '@/components/PinnedSection';
import { ShortcutsSection } from '@/components/ShortcutsSection';
import { UtilityBar } from '@/components/UtilityBar';
import { AddEditModal } from '@/components/AddEditModal';
import { PopularSitesModal } from '@/components/PopularSitesModal';
import { ApiSettingsModal } from '@/components/ApiSettingsModal';
import { AuthModal } from '@/components/AuthModal';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { Toast } from '@/components/Toast';

export default function DashboardPage() {
  const {
    user,
    apiKey,
    sites,
    prefs,
    pinnedSites,
    filteredSites,
    categories,
    toast,
    login,
    register,
    logout,
    addShortcut,
    updateShortcut,
    deleteShortcut,
    undoDelete,
    togglePin,
    recordClick,
    setEngine,
    setTag,
    cycleSort,
    importShortcuts,
    clearAllShortcuts,
    regenerateApiKey,
    showToast,
    dismissToast,
  } = useDashboard();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Shortcut | null>(null);
  const [isPopularOpen, setIsPopularOpen] = useState(false);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleOpenAdd = () => {
    setEditingSite(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (site: Shortcut) => {
    setEditingSite(site);
    setIsAddEditOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddEditOpen(false);
    setEditingSite(null);
  };

  const handleSaveShortcut = (data: {
    url: string;
    name?: string;
    category?: string;
    pinned?: boolean;
  }) => {
    if (editingSite) {
      updateShortcut(editingSite.id, data);
    } else {
      addShortcut(data);
    }
    handleCloseModal();
  };

  const handleAddPopularSite = (item: PopularSite) => {
    addShortcut({
      url: item.url,
      name: item.name,
      category: item.category,
      pinned: false,
    });
  };

  return (
    <main className="shell" style={{ position: 'relative' }}>
      {/* Top Right Fixed User Avatar & Profile Dropdown */}
      <div className="top-bar-actions">
        <UserAvatarMenu
          user={user}
          apiKey={apiKey}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenApiSettings={() => setIsApiSettingsOpen(true)}
          onLogout={logout}
          onShowToast={(msg) => showToast(msg)}
        />
      </div>

      {/* Clock, Date, Greeting, and Multi-Engine Search */}
      <ClockHero
        engineIndex={prefs.engine}
        onEngineChange={setEngine}
      />

      {/* Starred / Pinned shortcuts section */}
      <PinnedSection
        pinnedSites={pinnedSites}
        onEdit={handleOpenEdit}
        onDelete={deleteShortcut}
        onTogglePin={togglePin}
        onClickSite={recordClick}
      />

      {/* Main Shortcuts grid with Category filters & Open All */}
      <ShortcutsSection
        totalCount={sites.length}
        filteredSites={filteredSites}
        allSites={sites}
        categories={categories}
        activeTag={prefs.tag}
        onSelectTag={setTag}
        onOpenAddModal={handleOpenAdd}
        onEdit={handleOpenEdit}
        onDelete={deleteShortcut}
        onTogglePin={togglePin}
        onClickSite={recordClick}
      />

      {/* Footer utility bar: Browse popular, Sort switcher, Extension & API, Import, Export, Clear */}
      <UtilityBar
        sortMode={prefs.sort}
        sites={sites}
        onCycleSort={cycleSort}
        onOpenPopular={() => setIsPopularOpen(true)}
        onOpenApiSettings={() => setIsApiSettingsOpen(true)}
        onImportSites={importShortcuts}
        onClearAll={clearAllShortcuts}
        onShowToast={(msg) => showToast(msg)}
      />

      {/* Add / Edit Shortcut Modal */}
      <AddEditModal
        isOpen={isAddEditOpen}
        editingSite={editingSite}
        categories={categories}
        onClose={handleCloseModal}
        onSave={handleSaveShortcut}
        onDelete={deleteShortcut}
      />

      {/* Browse Popular Sites Directory Modal */}
      <PopularSitesModal
        isOpen={isPopularOpen}
        userSites={sites}
        onClose={() => setIsPopularOpen(false)}
        onAddSite={handleAddPopularSite}
      />

      {/* Extension & API Settings Modal */}
      <ApiSettingsModal
        isOpen={isApiSettingsOpen}
        user={user}
        apiKey={apiKey}
        onClose={() => setIsApiSettingsOpen(false)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onRegenerateKey={regenerateApiKey}
        onShowToast={(msg) => showToast(msg)}
      />


      {/* Email & Password Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={login}
        onRegister={register}
        onShowToast={(msg) => showToast(msg)}
      />

      {/* Actionable Toast with Undo Buffer */}
      <Toast
        toast={toast}
        onUndo={undoDelete}
        onDismiss={dismissToast}
      />
    </main>
  );
}
