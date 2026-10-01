import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import {
  clickedDownloads,
  createdUrls,
  loadDemoViaUi,
  pngFile,
  revokedUrls,
  setGetContext,
  setToBlob,
  uploadViaUi,
} from './test-utils';

const tile = (i: number) => screen.getByTitle(new RegExp(`^Tile #${i} `));

const selectSingle = async (i: number) => {
  await act(async () => {
    fireEvent.click(tile(i));
  });
};

describe('single tile download', () => {
  it('downloads the tile and revokes its url on a timer', async () => {
    render(<App />);
    await loadDemoViaUi();
    vi.useFakeTimers();
    try {
      await selectSingle(0);
      await act(async () => {
        fireEvent.click(screen.getByText('Download Tile'));
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(clickedDownloads).toEqual(['sample_target_tile_0.png']);
      expect(createdUrls.length).toBeGreaterThan(0);
      expect(screen.getByText('Exported tile #0')).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      expect(screen.queryByText('Exported tile #0')).not.toBeInTheDocument();
      expect(revokedUrls.length).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('refuses zero-size tiles at extreme grids', async () => {
    render(<App />);
    await uploadViaUi([pngFile('tiny.png')], 2, 2);
    expect(await screen.findByText('tiny.png')).toBeInTheDocument();
    await selectSingle(0);
    await act(async () => {
      fireEvent.click(screen.getByText('Download Tile'));
    });
    expect(await screen.findByText('Tile has zero size at this grid')).toBeInTheDocument();
    expect(clickedDownloads).toEqual([]);
  });

  it('reports when the 2d context is unavailable', async () => {
    render(<App />);
    await loadDemoViaUi();
    setGetContext(null);
    await selectSingle(0);
    await act(async () => {
      fireEvent.click(screen.getByText('Download Tile'));
    });
    expect(await screen.findByText('Could not render tile image')).toBeInTheDocument();
  });

  it('reports when the tile blob cannot be rendered', async () => {
    render(<App />);
    await loadDemoViaUi();
    setToBlob(null);
    await selectSingle(0);
    await act(async () => {
      fireEvent.click(screen.getByText('Download Tile'));
    });
    expect(await screen.findByText('Could not render tile image')).toBeInTheDocument();
  });
});

describe('selected tiles download', () => {
  it('zips multiple tiles under one archive name', async () => {
    render(<App />);
    await loadDemoViaUi();
    await act(async () => {
      fireEvent.click(tile(0), { ctrlKey: true });
      fireEvent.click(tile(1), { ctrlKey: true });
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Download 2 (.zip)'));
    });
    expect(await screen.findByText('Exported 2 tiles')).toBeInTheDocument();
    expect(clickedDownloads).toEqual(['sample_target_selected_2.zip']);
  });

  it('skips zero-size tiles when zipping a tiny image', async () => {
    render(<App />);
    await uploadViaUi([pngFile('tiny.png')], 2, 2);
    expect(await screen.findByText('tiny.png')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTitle(/^Tile #0 /), { ctrlKey: true });
      fireEvent.click(screen.getByTitle(/^Tile #1 /), { ctrlKey: true });
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Download 2 (.zip)'));
    });
    expect(await screen.findByText('Exported 2 tiles')).toBeInTheDocument();
    expect(clickedDownloads).toEqual(['tiny_selected_2.zip']);
  });

  it('skips tiles when the 2d context is unavailable mid-zip', async () => {
    render(<App />);
    await loadDemoViaUi();
    setGetContext(null);
    await act(async () => {
      fireEvent.click(tile(0), { ctrlKey: true });
      fireEvent.click(tile(1), { ctrlKey: true });
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Download 2 (.zip)'));
    });
    expect(await screen.findByText('Exported 2 tiles')).toBeInTheDocument();
  });

  it('reports zip failures and releases the processing lock', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(JSZip.prototype, 'generateAsync').mockRejectedValueOnce(new Error('zip boom'));
    render(<App />);
    await loadDemoViaUi();
    await act(async () => {
      fireEvent.click(tile(0), { ctrlKey: true });
      fireEvent.click(tile(1), { ctrlKey: true });
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Download 2 (.zip)'));
    });
    expect(await screen.findByText('Export failed. Check console.')).toBeInTheDocument();
    expect(screen.getByText('Download 2 (.zip)')).toBeInTheDocument();
  });
});

describe('batch export', () => {
  it('exports one image to a named tiles archive', async () => {
    render(<App />);
    await loadDemoViaUi();
    await act(async () => {
      fireEvent.click(screen.getByText('Export Tiles'));
    });
    expect(await screen.findByText('Export complete!')).toBeInTheDocument();
    expect(clickedDownloads).toEqual(['sample_target_tiles.zip']);
  });

  it('exports several images into per-image folders of one batch archive', async () => {
    render(<App />);
    await uploadViaUi([pngFile('a.png'), pngFile('b.png')]);
    expect(await screen.findByText('b.png')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByText('Export All (2)'));
    });
    expect(await screen.findByText('Export complete!')).toBeInTheDocument();
    expect(clickedDownloads).toEqual(['magick_batch_tiles.zip']);
  });

  it('honors the resize tab dimensions', async () => {
    render(<App />);
    await loadDemoViaUi();
    fireEvent.click(screen.getByText('Resize'));
    const slider = screen.getByText('Scale Percentage').parentElement?.parentElement?.querySelector(
      'input[type="range"]',
    ) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '50' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Export Tiles'));
    });
    expect(await screen.findByText('Export complete!')).toBeInTheDocument();
  });

  it('exports whole processed images off the grid tab', async () => {
    render(<App />);
    await loadDemoViaUi();
    fireEvent.click(screen.getByText('Adjust'));
    await act(async () => {
      fireEvent.click(screen.getByText('Export Tiles'));
    });
    expect(await screen.findByText('Export complete!')).toBeInTheDocument();
    expect(clickedDownloads).toEqual(['sample_target_tiles.zip']);
  });

  it('skips tiles whose blob cannot be rendered and still finishes', async () => {
    render(<App />);
    await loadDemoViaUi();
    setToBlob(null);
    await act(async () => {
      fireEvent.click(screen.getByText('Export Tiles'));
    });
    expect(await screen.findByText('Export complete!')).toBeInTheDocument();
  });

  it('skips zero-size tiles in batch export of a tiny image', async () => {
    render(<App />);
    await uploadViaUi([pngFile('tiny.png')], 2, 2);
    expect(await screen.findByText('tiny.png')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByText('Export Tiles'));
    });
    expect(await screen.findByText('Export complete!')).toBeInTheDocument();
    expect(clickedDownloads).toEqual(['tiny_tiles.zip']);
  });

  it('skips tiles in batch export when the 2d context is unavailable', async () => {
    render(<App />);
    await loadDemoViaUi();
    setGetContext(null);
    await act(async () => {
      fireEvent.click(screen.getByText('Export Tiles'));
    });
    expect(await screen.findByText('Export complete!')).toBeInTheDocument();
  });

  it('reports batch zip failures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(JSZip.prototype, 'generateAsync').mockRejectedValueOnce(new Error('zip boom'));
    render(<App />);
    await loadDemoViaUi();
    await act(async () => {
      fireEvent.click(screen.getByText('Export Tiles'));
    });
    expect(await screen.findByText('Export failed. Check console.')).toBeInTheDocument();
  });

  it('offers the sample loader instead of export with no images', () => {
    render(<App />);
    // header button plus the empty-state link
    expect(screen.getAllByText('Load Sample')).toHaveLength(2);
    expect(screen.queryByText('Export Tiles')).not.toBeInTheDocument();
  });
});
