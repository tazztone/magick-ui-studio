/**
 * Copy text, preferring the Async Clipboard API with a legacy fallback.
 *
 * `navigator.clipboard.writeText` needs a secure context (https/localhost),
 * so plain-http origins (e.g. a LAN `vite preview`) fall through to the
 * textarea + `execCommand` path. Resolves `false` when nothing worked.
 */
export const copyText = async (text: string): Promise<boolean> => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path (e.g. permission denied)
    }
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    try {
      el.select();
      return document.execCommand('copy');
    } finally {
      document.body.removeChild(el);
    }
  } catch {
    return false;
  }
};
