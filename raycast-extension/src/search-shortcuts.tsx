import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from '@raycast/api';
import { useEffect, useState, useMemo } from 'react';
import { fetchShortcuts, deleteShortcut, getBaseUrl } from './api';
import { Shortcut } from './types';

export default function SearchShortcuts() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  async function loadData() {
    setIsLoading(true);
    try {
      const items = await fetchShortcuts();
      setShortcuts(items);
    } catch (err: any) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to fetch shortcuts',
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    shortcuts.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [shortcuts]);

  const filteredShortcuts = useMemo(() => {
    if (selectedCategory === 'all') return shortcuts;
    if (selectedCategory === 'pinned') return shortcuts.filter((s) => s.pinned);
    return shortcuts.filter((s) => s.category === selectedCategory);
  }, [shortcuts, selectedCategory]);

  const pinnedList = useMemo(
    () => filteredShortcuts.filter((s) => s.pinned),
    [filteredShortcuts]
  );
  const otherList = useMemo(
    () => filteredShortcuts.filter((s) => !s.pinned),
    [filteredShortcuts]
  );

  async function handleDelete(shortcut: Shortcut) {
    if (
      await confirmAlert({
        title: `Delete "${shortcut.name}"?`,
        message: 'This shortcut will be removed from your dashboard.',
        primaryAction: { title: 'Delete', style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await deleteShortcut(shortcut.id);
        setShortcuts((prev) => prev.filter((s) => s.id !== shortcut.id));
        showToast({ style: Toast.Style.Success, title: 'Shortcut deleted' });
      } catch (err: any) {
        showToast({ style: Toast.Style.Failure, title: 'Failed to delete', message: err.message });
      }
    }
  }

  function formatFavicon(url: string) {
    try {
      const u = url.startsWith('http') ? url : `https://${url}`;
      const domain = new URL(u).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return Icon.Globe;
    }
  }

  function ensureUrl(url: string) {
    return url.startsWith('http') ? url : `https://${url}`;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search dashboard bookmarks (e.g. GitHub, ChatGPT)..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          value={selectedCategory}
          onChange={setSelectedCategory}
        >
          <List.Dropdown.Item title="All Categories" value="all" icon={Icon.AppWindowGrid3x3} />
          <List.Dropdown.Item title="⭐ Pinned Only" value="pinned" icon={Icon.Star} />
          <List.Dropdown.Section title="Categories">
            {categories.map((cat) => (
              <List.Dropdown.Item key={cat} title={cat} value={cat} icon={Icon.Tag} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {pinnedList.length > 0 && (
        <List.Section title="⭐ Pinned Shortcuts" subtitle={`${pinnedList.length} pinned`}>
          {pinnedList.map((item) => (
            <List.Item
              key={item.id}
              icon={{ source: formatFavicon(item.url), fallback: Icon.Globe }}
              title={item.name}
              subtitle={item.url}
              accessories={[
                ...(item.category
                  ? [{ tag: { value: item.category, color: Color.Purple } }]
                  : []),
                { icon: { source: Icon.Star, tintColor: Color.Yellow } },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={ensureUrl(item.url)} />
                  <Action.CopyToClipboard content={ensureUrl(item.url)} title="Copy URL" />
                  <Action.CopyToClipboard content={item.name} title="Copy Title" />
                  <Action.OpenInBrowser
                    url={getBaseUrl()}
                    title="Open Dashboard"
                    icon={Icon.Window}
                    shortcut={{ modifiers: ['cmd', 'shift'], key: 'd' }}
                  />
                  <Action
                    title="Reload Bookmarks"
                    icon={Icon.RotateClockwise}
                    onAction={loadData}
                    shortcut={{ modifiers: ['cmd'], key: 'r' }}
                  />
                  <Action
                    title="Delete Bookmark"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(item)}
                    shortcut={{ modifiers: ['ctrl'], key: 'x' }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Bookmarks" subtitle={`${otherList.length} items`}>
        {otherList.map((item) => (
          <List.Item
            key={item.id}
            icon={{ source: formatFavicon(item.url), fallback: Icon.Globe }}
            title={item.name}
            subtitle={item.url}
            accessories={[
              ...(item.category
                ? [{ tag: { value: item.category, color: Color.Blue } }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={ensureUrl(item.url)} />
                <Action.CopyToClipboard content={ensureUrl(item.url)} title="Copy URL" />
                <Action.CopyToClipboard content={item.name} title="Copy Title" />
                <Action.OpenInBrowser
                  url={getBaseUrl()}
                  title="Open Dashboard"
                  icon={Icon.Window}
                  shortcut={{ modifiers: ['cmd', 'shift'], key: 'd' }}
                />
                <Action
                  title="Reload Bookmarks"
                  icon={Icon.RotateClockwise}
                  onAction={loadData}
                  shortcut={{ modifiers: ['cmd'], key: 'r' }}
                />
                <Action
                  title="Delete Bookmark"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(item)}
                  shortcut={{ modifiers: ['ctrl'], key: 'x' }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {!isLoading && shortcuts.length === 0 && (
        <List.EmptyView
          icon={Icon.Bookmark}
          title="No Bookmarks Found"
          description="Check your API Key in Extension Preferences or save your first bookmark!"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={getBaseUrl()} title="Open Dashboard" />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
