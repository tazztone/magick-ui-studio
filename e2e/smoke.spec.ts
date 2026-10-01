import { promises as fs } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import JSZip from 'jszip';

test('boots to the empty state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Select or drop images')).toBeVisible();
});

test('loads the sample with a 3x3 tile overlay', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try Sample Image').click();
  await expect(page.getByText('sample_target.png')).toBeVisible();
  await expect(page.getByTitle(/^Tile #\d+ /)).toHaveCount(9);
});

test('downloads a single tile with the right filename and bytes', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try Sample Image').click();
  await page.getByTitle(/^Tile #0 /).click();
  await page.getByText('Download Tile').click();
  const download = await page.waitForEvent('download');
  expect(download.suggestedFilename()).toBe('sample_target_tile_0.png');
  const file = await download.path();
  expect(file).toBeTruthy();
  expect((await fs.stat(file as string)).size).toBeGreaterThan(0);
});

test('copies the CLI command and shows a toast', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try Sample Image').click();
  await page.getByText('ImageMagick CLI Syntax').click();
  await page.getByText('Copy').click();
  await expect(page.getByText('Command copied to clipboard')).toBeVisible();
});

test('batch-exports two uploads into one valid zip', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('input[type="file"]')
    .setInputFiles([path.resolve('e2e/fixtures/a.svg'), path.resolve('e2e/fixtures/b.svg')]);
  await expect(page.getByText('a.svg')).toBeVisible();
  await expect(page.getByText('b.svg')).toBeVisible();
  await page.getByText('Export All (2)').click();
  const download = await page.waitForEvent('download');
  expect(download.suggestedFilename()).toBe('magick_batch_tiles.zip');
  const file = await download.path();
  const zip = await JSZip.loadAsync(await fs.readFile(file as string));
  const names = Object.keys(zip.files).filter(n => !zip.files[n].dir);
  // two images x nine tiles each, filed under per-image folders
  expect(names).toHaveLength(18);
  expect(names.every(n => /_tile_\d+\.png$/.test(n))).toBe(true);
});
