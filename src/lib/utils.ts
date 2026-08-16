export function faviconUrl(url: string): string {
  try {
    const formatted = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const u = new URL(formatted);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return '';
  }
}

export function hostname(url: string): string {
  try {
    const formatted = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    return new URL(formatted).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

export function fullUrl(url: string): string {
  if (!url) return '';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
}

export function isUrlLike(input: string): boolean {
  const trimmed = input.trim();
  const domainPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i;
  const protocolPattern = /^https?:\/\//i;
  const localhostPattern = /^localhost(:\d+)?(\/.*)?$/i;
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/;
  return protocolPattern.test(trimmed) || domainPattern.test(trimmed) || localhostPattern.test(trimmed) || ipPattern.test(trimmed);
}
