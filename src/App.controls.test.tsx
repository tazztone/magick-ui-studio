import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { loadDemoViaUi } from './test-utils';

const colsInput = () => {
  const plus = screen.getByTitle('More columns');
  return plus.parentElement?.querySelector('input') as HTMLInputElement;
};
const rowsInput = () => {
  const plus = screen.getByTitle('More rows');
  return plus.parentElement?.querySelector('input') as HTMLInputElement;
};
const overlapSlider = () =>
  document.querySelector('input[type="range"][max="128"]') as HTMLInputElement;

const expandCli = () => {
  fireEvent.click(screen.getByText('ImageMagick CLI Syntax'));
};

describe('grid controls', () => {
  it('presets switch the grid and mark the active one', async () => {
    render(<App />);
    await loadDemoViaUi();
    fireEvent.click(screen.getByText('2×2 Quad'));
    expect(screen.getByText('Total Slices:')).toBeInTheDocument();
    expect(screen.getByText('4 tiles')).toBeInTheDocument();
  });

  it('steppers clamp at the supported range', async () => {
    render(<App />);
    await loadDemoViaUi();
    fireEvent.click(screen.getByTitle('More columns'));
    expect(colsInput().value).toBe('4');
    fireEvent.click(screen.getByTitle('Fewer columns'));
    expect(colsInput().value).toBe('3');
    fireEvent.click(screen.getByTitle('More rows'));
    expect(rowsInput().value).toBe('4');
    fireEvent.click(screen.getByTitle('Fewer rows'));
    expect(rowsInput().value).toBe('3');
    // floor at 1
    fireEvent.click(screen.getByTitle('Fewer rows'));
    fireEvent.click(screen.getByTitle('Fewer rows'));
    fireEvent.click(screen.getByTitle('Fewer rows'));
    expect(rowsInput().value).toBe('1');
  });

  it('typed counts clamp through the same sanitizer', async () => {
    render(<App />);
    await loadDemoViaUi();
    fireEvent.change(colsInput(), { target: { value: '99' } });
    expect(colsInput().value).toBe('24');
    fireEvent.change(colsInput(), { target: { value: 'abc' } });
    expect(colsInput().value).toBe('1');
    fireEvent.change(rowsInput(), { target: { value: '0' } });
    expect(rowsInput().value).toBe('1');
  });

  it('overlap stepper buttons nudge by one pixel', async () => {
    render(<App />);
    await loadDemoViaUi();
    fireEvent.click(screen.getByTitle('More overlap'));
    expect(screen.getByText('1px')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Less overlap'));
    expect(screen.getByText('0px')).toBeInTheDocument();
    // floor at 0
    fireEvent.click(screen.getByTitle('Less overlap'));
    expect(screen.getByText('0px')).toBeInTheDocument();
  });

  it('overlap slider updates the label and metrics suffix', async () => {
    render(<App />);
    await loadDemoViaUi();
    fireEvent.change(overlapSlider(), { target: { value: '10' } });
    expect(screen.getByText('3×3 Grid +10')).toBeInTheDocument();
    expect(screen.getByText(/\(base 341 × 341 \+10\)/)).toBeInTheDocument();
  });
});

describe('tabs and adjustments', () => {
  it('resize tab scales the reported dimensions', async () => {
    render(<App />);
    await loadDemoViaUi();
    fireEvent.click(screen.getByText('Resize'));
    const slider = screen.getByText('Scale Percentage').parentElement?.parentElement?.querySelector(
      'input[type="range"]',
    ) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '50' } });
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('512 × 512 px')).toBeInTheDocument();
    // back to the grid tab
    fireEvent.click(screen.getByText('Grid Slices'));
    expect(screen.getByTitle(/^Tile #0 /)).toBeInTheDocument();
  });

  it('adjust tab rotates the preview and toggles filters', async () => {
    render(<App />);
    await loadDemoViaUi();
    fireEvent.click(screen.getByText('Adjust'));
    fireEvent.click(screen.getByText('90°'));
    const preview = screen.getByAltText('Preview') as HTMLImageElement;
    expect(preview.style.transform).toBe('rotate(90deg)');
    fireEvent.click(screen.getByText('Grayscale'));
    fireEvent.click(screen.getByText('Invert'));
    expect(preview.style.filter).toBe('grayscale(100%) invert(100%)');
  });

  it('format switch gates the quality slider', async () => {
    render(<App />);
    await loadDemoViaUi();
    expect(screen.queryByText('Quality')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('JPG'));
    expect(screen.getByText('Quality')).toBeInTheDocument();
    fireEvent.click(screen.getByText('webp'));
    expect(screen.getByText('Quality')).toBeInTheDocument();
    fireEvent.click(screen.getByText('png'));
    expect(screen.queryByText('Quality')).not.toBeInTheDocument();
  });

  it('quality slider feeds the generated command', async () => {
    render(<App />);
    await loadDemoViaUi();
    fireEvent.click(screen.getByText('JPG'));
    const slider = screen.getByText('Quality').parentElement?.parentElement?.querySelector(
      'input[type="range"]',
    ) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '80' } });
    expect(screen.getByText('80%')).toBeInTheDocument();
    fireEvent.click(screen.getByText('ImageMagick CLI Syntax'));
    expect(screen.getByText(/-quality 80/)).toBeInTheDocument();
  });
});

describe('cli snippet', () => {
  it('is collapsed until toggled and shows the placeholder without images', () => {
    render(<App />);
    expect(screen.queryByText('# Upload images to generate syntax')).not.toBeInTheDocument();
    expandCli();
    expect(screen.getByText('# Upload images to generate syntax')).toBeInTheDocument();
  });

  it('shows the generated command and switches shells', async () => {
    render(<App />);
    await loadDemoViaUi();
    expandCli();
    expect(
      screen.getByText('magick "sample_target.png" -strip -crop 3x3@ +repage "sample_target_tile_%d.png"'),
    ).toBeInTheDocument();
    // overlap makes the scripts shell-specific
    fireEvent.change(overlapSlider(), { target: { value: '10' } });
    fireEvent.click(screen.getByText('PowerShell'));
    expect(screen.getByText(/\$tiles = @\(/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('CMD'));
    expect(screen.getByText(/setlocal enabledelayedexpansion/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Bash'));
    expect(screen.getByText(/for i in "\$\{!tiles\[@\]\}"/)).toBeInTheDocument();
  });

  it('copies the command and resets the copied indicator on a timer', async () => {
    render(<App />);
    await loadDemoViaUi();
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByText('Copy'));
      // flush the async copy before asserting (findBy polling needs real timers)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByText('Command copied to clipboard')).toBeInTheDocument();
      expect(screen.getByText('Copied')).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
      });
      expect(screen.queryByText('Command copied to clipboard')).not.toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports copy failure when the clipboard command throws', async () => {
    render(<App />);
    await loadDemoViaUi();
    (document.execCommand as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('denied');
    });
    fireEvent.click(screen.getByText('Copy'));
    expect(await screen.findByText('Failed to copy')).toBeInTheDocument();
  });
});

describe('zoom controls', () => {
  it('zooms in, out, and resets', async () => {
    render(<App />);
    await loadDemoViaUi();
    expect(screen.getByText('100%')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Zoom In'));
    expect(screen.getByText('120%')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Zoom Out'));
    expect(screen.getByText('100%')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Zoom In'));
    fireEvent.click(screen.getByTitle('Reset Zoom'));
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
