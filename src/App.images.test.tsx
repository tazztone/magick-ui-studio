import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import {
  failImage,
  loadDemoViaUi,
  loadImage,
  pendingImages,
  pngFile,
  revokedUrls,
  textFile,
  uploadViaUi,
} from './test-utils';

describe('image loading', () => {
  it('uploads a valid file and lists it in the dock', async () => {
    render(<App />);
    await uploadViaUi([pngFile('photo.png')]);
    expect(await screen.findByText('photo.png')).toBeInTheDocument();
    expect(screen.getByText('Add More')).toBeInTheDocument();
  });

  it('rejects non-image files with a toast', async () => {
    render(<App />);
    await uploadViaUi([textFile('notes.txt')]);
    expect(await screen.findByText('Please upload valid image files')).toBeInTheDocument();
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
  });

  it('ignores empty drops without a toast', async () => {
    render(<App />);
    const dropzone = screen.getByText('Select or drop images').closest('div') as HTMLElement;
    const empty = dropzone.parentElement as HTMLElement;
    fireEvent.drop(empty, { dataTransfer: { files: [] } });
    expect(screen.getByText('Select or drop images')).toBeInTheDocument();
  });

  it('tolerates a null file list on drop', async () => {
    render(<App />);
    const dropzone = screen.getByText('Select or drop images').closest('div') as HTMLElement;
    const empty = dropzone.parentElement as HTMLElement;
    fireEvent.drop(empty, { dataTransfer: { files: null } });
    expect(screen.getByText('Select or drop images')).toBeInTheDocument();
  });

  it('reports loaded vs skipped counts for mixed batches', async () => {
    render(<App />);
    const before = pendingImages().length;
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [pngFile('ok.png'), pngFile('broken.png'), pngFile('empty.png')] } });
    const [ok, broken, empty] = pendingImages().slice(before);
    await act(async () => {
      loadImage(ok, 800, 600);
      failImage(broken);
      loadImage(empty, 0, 0);
    });
    expect(await screen.findByText('Loaded 1, skipped 2')).toBeInTheDocument();
    expect(screen.getByText('ok.png')).toBeInTheDocument();
  });

  it('reports when nothing could be loaded', async () => {
    render(<App />);
    const before = pendingImages().length;
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [pngFile('broken.png')] } });
    const [broken] = pendingImages().slice(before);
    await act(async () => {
      failImage(broken);
    });
    expect(await screen.findByText('Could not load any of those images')).toBeInTheDocument();
  });

  it('switches the active image when its dock chip is clicked', async () => {
    render(<App />);
    await uploadViaUi([pngFile('a.png'), pngFile('b.png')]);
    expect(await screen.findByText('a.png')).toBeInTheDocument();
    expect(screen.getByText('b.png')).toBeInTheDocument();
    fireEvent.click(screen.getByText('b.png'));
    // both stay listed; clicking does not reload anything
    expect(screen.getByText('a.png')).toBeInTheDocument();
  });

  it('shows dragging feedback while a file hovers the canvas', async () => {
    render(<App />);
    await loadDemoViaUi();
    const canvas = screen.getByAltText('Preview').parentElement?.parentElement as HTMLElement;
    fireEvent.dragOver(canvas);
    fireEvent.dragLeave(canvas);
    expect(canvas).toBeInTheDocument();
  });
});

describe('file pickers', () => {
  it('add-more and empty-state clicks open the file dialog', async () => {
    const clicks: HTMLElement[] = [];
    HTMLInputElement.prototype.click = (() => {
      clicks.push(document.activeElement as HTMLElement);
    }) as typeof HTMLInputElement.prototype.click;
    render(<App />);
    // empty-state dropzone opens the picker
    fireEvent.click(screen.getByText('Select or drop images'));
    expect(clicks).toHaveLength(1);
    await loadDemoViaUi();
    // dock add-more opens the picker too
    fireEvent.click(screen.getByText('Add More'));
    expect(clicks).toHaveLength(2);
  });
});

describe('image removal', () => {
  it('revokes blob urls for uploads but not data urls', async () => {
    render(<App />);
    await uploadViaUi([pngFile('photo.png')]);
    expect(await screen.findByText('photo.png')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Remove file'));
    expect(screen.queryByText('photo.png')).not.toBeInTheDocument();
    expect(revokedUrls.length).toBeGreaterThan(0);

    await loadDemoViaUi();
    const revokedBefore = revokedUrls.length;
    fireEvent.click(screen.getByTitle('Remove file'));
    expect(revokedUrls.length).toBe(revokedBefore);
  });

  it('clamps the active index when the focused image is removed', async () => {
    render(<App />);
    await uploadViaUi([pngFile('a.png'), pngFile('b.png')]);
    expect(await screen.findByText('b.png')).toBeInTheDocument();
    fireEvent.click(screen.getByText('b.png'));
    const removers = screen.getAllByTitle('Remove file');
    fireEvent.click(removers[1]);
    expect(screen.queryByText('b.png')).not.toBeInTheDocument();
    expect(screen.getByText('a.png')).toBeInTheDocument();
  });
});
