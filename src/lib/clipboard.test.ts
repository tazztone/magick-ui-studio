import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './clipboard';

const execCommand = () => document.execCommand as unknown as ReturnType<typeof vi.fn>;

const setClipboard = (impl: (text: string) => Promise<void> | undefined) => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    writable: true,
    value: impl ? { writeText: vi.fn(impl) } : undefined,
  });
};

afterEach(() => {
  // jsdom ships no navigator.clipboard; remove stubs between tests
  delete (navigator as unknown as Record<string, unknown>).clipboard;
});

describe('copyText', () => {
  it('prefers the Async Clipboard API and skips the fallback', async () => {
    setClipboard(async () => undefined);
    await expect(copyText('hello')).resolves.toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
    expect(execCommand()).not.toHaveBeenCalled();
  });

  it('falls back when clipboard-write rejects', async () => {
    setClipboard(async () => {
      throw new Error('denied');
    });
    await expect(copyText('hello')).resolves.toBe(true);
    expect(execCommand()).toHaveBeenCalledTimes(1);
  });

  it('falls back when there is no clipboard API', async () => {
    setClipboard(undefined);
    await expect(copyText('hello')).resolves.toBe(true);
    expect(execCommand()).toHaveBeenCalledTimes(1);
  });

  it('reports a failed execCommand as failure', async () => {
    setClipboard(undefined);
    execCommand().mockReturnValueOnce(false);
    await expect(copyText('hello')).resolves.toBe(false);
  });

  it('reports a throwing execCommand as failure without leaking the textarea', async () => {
    setClipboard(undefined);
    execCommand().mockImplementationOnce(() => {
      throw new Error('denied');
    });
    await expect(copyText('hello')).resolves.toBe(false);
    expect(document.querySelectorAll('textarea')).toHaveLength(0);
  });
});
