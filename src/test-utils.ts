/**
 * Shared DOM mocks + UI helpers for App component tests.
 * Excluded from coverage (see vite.config.ts). Mocks are installed with plain
 * assignment (not vi.spyOn) so the afterEach vi.restoreMocks() in test-setup
 * does not wipe them; resetAllMocks() runs before every test.
 */
import { act, fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';

export const createdUrls: string[] = [];
export const revokedUrls: string[] = [];
export const clickedDownloads: string[] = [];

let urlSeq = 0;

export const installUrlMocks = () => {
  createdUrls.length = 0;
  revokedUrls.length = 0;
  urlSeq = 0;
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(() => {
      const url = `blob:mock-${++urlSeq}`;
      createdUrls.push(url);
      return url;
    }),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn((u: string) => {
      revokedUrls.push(u);
    }),
  });
};

export const installDownloadMocks = () => {
  clickedDownloads.length = 0;
  Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
    configurable: true,
    writable: true,
    value: vi.fn(function (this: HTMLAnchorElement) {
      clickedDownloads.push(this.download);
    }),
  });
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    writable: true,
    value: vi.fn(() => true),
  });
};

export type CtxStub = {
  filter: string;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  rotate: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
};

export const makeCtxStub = (): CtxStub => ({
  filter: 'none',
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  drawImage: vi.fn(),
});

export let lastCtx: CtxStub | null = null;

export const installCanvasMocks = (blob: Blob | null = new Blob(['tile'], { type: 'image/png' })) => {
  lastCtx = makeCtxStub();
  const ctx = lastCtx;
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: vi.fn(() => ctx),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    configurable: true,
    writable: true,
    value: vi.fn((cb: (b: Blob | null) => void) => {
      cb(blob);
    }),
  });
};

export const setToBlob = (blob: Blob | null) => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    configurable: true,
    writable: true,
    value: vi.fn((cb: (b: Blob | null) => void) => {
      cb(blob);
    }),
  });
};

export const setGetContext = (ctx: CtxStub | null) => {
  lastCtx = ctx;
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: vi.fn(() => ctx),
  });
};

/** Controllable Image replacement: `new Image(); img.src = ...` captures the
 *  instance; tests fire load/error explicitly. */
export class FakeImage {
  static instances: FakeImage[] = [];
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  width = 0;
  height = 0;
  private _src = '';
  get src(): string {
    return this._src;
  }
  set src(v: string) {
    this._src = v;
    FakeImage.instances.push(this);
  }
}

export const installImageMock = () => {
  FakeImage.instances = [];
  vi.stubGlobal('Image', FakeImage);
};

export const pendingImages = (): FakeImage[] => FakeImage.instances;

export const loadImage = (img: FakeImage, w: number, h: number) => {
  img.naturalWidth = w;
  img.naturalHeight = h;
  img.width = w;
  img.height = h;
  img.onload?.();
};

export const failImage = (img: FakeImage) => {
  img.onerror?.();
};

export const resetAllMocks = () => {
  installUrlMocks();
  installDownloadMocks();
  installCanvasMocks();
  installImageMock();
};

/** Click the empty-state sample button and resolve its Image load at W×H. */
export const loadDemoViaUi = async (w = 1024, h = 1024) => {
  fireEvent.click(screen.getByText('Try Sample Image'));
  const imgs = pendingImages();
  const img = imgs[imgs.length - 1];
  await act(async () => {
    loadImage(img, w, h);
  });
  await screen.findByText('sample_target.png');
};

/** Change the hidden file input and resolve each new Image load at W×H. */
export const uploadViaUi = async (files: File[], w = 800, h = 600) => {
  const before = pendingImages().length;
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
  const fresh = pendingImages().slice(before);
  await act(async () => {
    fresh.forEach(img => loadImage(img, w, h));
  });
};

export const pngFile = (name: string): File => new File(['pixels'], name, { type: 'image/png' });
export const textFile = (name: string): File => new File(['hello'], name, { type: 'text/plain' });
