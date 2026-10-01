import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { loadDemoViaUi } from './test-utils';

const tile = (i: number) => screen.getByTitle(new RegExp(`^Tile #${i} `));
const clickTile = (i: number, init?: object) => {
  fireEvent.click(tile(i), init);
};

describe('tile selection', () => {
  it('shows the empty state before any image loads', () => {
    render(<App />);
    expect(screen.getByText('Select or drop images')).toBeInTheDocument();
    expect(screen.queryByTitle(/^Tile #0 /)).not.toBeInTheDocument();
  });

  it('selects a single tile on click and shows its px size', async () => {
    render(<App />);
    await loadDemoViaUi();
    clickTile(4);
    expect(screen.getByText('Tile #4 (R2, C2)')).toBeInTheDocument();
    // shown both in the inspector and the metrics box
    expect(screen.getAllByText('341 × 341 px')).toHaveLength(2);
    expect(screen.getByText('Download Tile')).toBeInTheDocument();
  });

  it('clicking the selected tile again clears the selection', async () => {
    render(<App />);
    await loadDemoViaUi();
    clickTile(4);
    expect(screen.getByText('Tile #4 (R2, C2)')).toBeInTheDocument();
    clickTile(4);
    expect(screen.queryByText(/Tile #4 /)).not.toBeInTheDocument();
    expect(screen.queryByText('Download Tile')).not.toBeInTheDocument();
  });

  it('ctrl+click toggles tiles into a multi-select', async () => {
    render(<App />);
    await loadDemoViaUi();
    clickTile(0, { ctrlKey: true });
    clickTile(1, { ctrlKey: true });
    expect(screen.getByText('2 tiles selected')).toBeInTheDocument();
    expect(screen.getByText('#0 #1')).toBeInTheDocument();
    expect(screen.getByText('Download 2 (.zip)')).toBeInTheDocument();
    // toggling a present tile removes it
    clickTile(0, { ctrlKey: true });
    expect(screen.getByText('Tile #1 (R1, C2)')).toBeInTheDocument();
  });

  it('shift+click selects the rect from the anchor regardless of order', async () => {
    render(<App />);
    await loadDemoViaUi();
    clickTile(0);
    clickTile(4, { shiftKey: true });
    expect(screen.getByText('4 tiles selected')).toBeInTheDocument();
    expect(screen.getByText('#0 #1 #3 #4')).toBeInTheDocument();
  });

  it('shift+click without an anchor falls back to single select', async () => {
    render(<App />);
    await loadDemoViaUi();
    clickTile(4, { shiftKey: true });
    expect(screen.getByText('Tile #4 (R2, C2)')).toBeInTheDocument();
  });

  it('sticky multi mode toggles tiles with plain clicks', async () => {
    render(<App />);
    await loadDemoViaUi();
    fireEvent.click(screen.getByText('Multi'));
    clickTile(2);
    clickTile(5);
    expect(screen.getByText('2 tiles selected')).toBeInTheDocument();
    expect(screen.getByText('#2 #5')).toBeInTheDocument();
  });

  it('escape clears the selection; other keys do not', async () => {
    render(<App />);
    await loadDemoViaUi();
    clickTile(3);
    expect(screen.getByText('Tile #3 (R2, C1)')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByText('Tile #3 (R2, C1)')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText(/Tile #3 /)).not.toBeInTheDocument();
  });

  it('select-all and clear buttons manage the badge selection', async () => {
    render(<App />);
    await loadDemoViaUi();
    clickTile(0);
    fireEvent.click(screen.getByTitle('Select all tiles'));
    expect(screen.getByText('9 tiles selected')).toBeInTheDocument();
    // truncates the index preview after six
    expect(screen.getByText('+3 more')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Clear selection'));
    expect(screen.queryByText('tiles selected')).not.toBeInTheDocument();
  });

  it('changing grid dims resets the selection', async () => {
    render(<App />);
    await loadDemoViaUi();
    clickTile(0);
    expect(screen.getByText('Tile #0 (R1, C1)')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('More columns'));
    expect(screen.queryByText(/Tile #0 /)).not.toBeInTheDocument();
  });

  it('grid overlay toggle hides tiles and relabels itself', async () => {
    render(<App />);
    await loadDemoViaUi();
    fireEvent.click(screen.getByTitle('Toggle grid overlay'));
    expect(screen.queryByTitle(/^Tile #0 /)).not.toBeInTheDocument();
    expect(screen.getByText('Grid Off')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Toggle grid overlay'));
    expect(tile(0)).toBeInTheDocument();
  });

  it('overlap grows the inspector readout with the extended size', async () => {
    render(<App />);
    await loadDemoViaUi();
    const overlap = document.querySelector('input[type="range"][max="128"]') as HTMLInputElement;
    fireEvent.change(overlap, { target: { value: '10' } });
    // overlay toggle reflects overlap
    expect(screen.getByText('3×3 Grid +10')).toBeInTheDocument();
    await act(async () => {
      clickTile(4);
    });
    // base 341×341, extended by the shared strip
    expect(screen.getByText(/\(\+10 → 351 × 351\)/)).toBeInTheDocument();
  });
});
