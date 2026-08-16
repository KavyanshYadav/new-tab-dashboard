import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  Clipboard,
  Icon,
} from '@raycast/api';
import { useEffect, useState } from 'react';
import { createShortcut, fetchCategories } from './api';

export default function SaveBookmark() {
  const { pop } = useNavigation();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [pinned, setPinned] = useState(false);
  const [categories, setCategories] = useState<string[]>(['Dev', 'AI', 'Social', 'Productivity', 'News']);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-detect URL from clipboard on open
  useEffect(() => {
    (async () => {
      try {
        const text = await Clipboard.readText();
        if (text && /^https?:\/\//i.test(text.trim())) {
          const cleanUrl = text.trim();
          setUrl(cleanUrl);
          try {
            const parsed = new URL(cleanUrl);
            setName(parsed.hostname.replace(/^www\./, ''));
          } catch {}
        }
      } catch {}

      try {
        const cats = await fetchCategories();
        if (cats && cats.length > 0) {
          setCategories(cats);
        }
      } catch {}
    })();
  }, []);

  async function handleSubmit() {
    if (!url.trim()) {
      showToast({ style: Toast.Style.Failure, title: 'URL is required' });
      return;
    }

    setIsLoading(true);
    try {
      await createShortcut({
        url: url.trim(),
        name: name.trim() || undefined,
        category: category.trim() || undefined,
        pinned,
      });

      showToast({
        style: Toast.Style.Success,
        title: 'Saved to Dashboard ✓',
        message: name || url,
      });
      pop();
    } catch (err: any) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to save shortcut',
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Bookmark" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://github.com"
        value={url}
        onChange={(val) => {
          setUrl(val);
          if (!name) {
            try {
              const u = val.startsWith('http') ? val : `https://${val}`;
              setName(new URL(u).hostname.replace(/^www\./, ''));
            } catch {}
          }
        }}
      />

      <Form.TextField
        id="name"
        title="Title / Name"
        placeholder="e.g. GitHub"
        value={name}
        onChange={setName}
      />

      <Form.Dropdown id="category" title="Category" value={category} onChange={setCategory}>
        <Form.Dropdown.Item value="" title="None (General)" />
        {categories.map((c) => (
          <Form.Dropdown.Item key={c} value={c} title={c} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        id="pinned"
        label="Pin to top (⭐ Pinned section)"
        value={pinned}
        onChange={setPinned}
      />
    </Form>
  );
}
