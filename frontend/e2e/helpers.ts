import { expect, type Page, type TestInfo } from '@playwright/test';

export const isMobile = (t: TestInfo) => t.project.name === 'mobile';
export const isDesktop = (t: TestInfo) => t.project.name === 'desktop';

export async function openExplorer(page: Page, id: string) {
  await page.goto(`/jelajah/${id}`);
  await expect(page.getByTestId('explorer')).toHaveAttribute('data-suspension', id);
  await expect(page.getByTestId('viewer')).toHaveAttribute('data-model-ready', 'true', { timeout: 30_000 });
}

/** Opens the component list (inline on desktop, bottom sheet on tablet/mobile) and clicks an item. */
export async function pickComponentFromList(page: Page, t: TestInfo, componentId: string) {
  if (!isDesktop(t)) await page.getByTestId('open-components').click();
  await page.getByTestId(`component-${componentId}`).click();
}

/** Shows an info tab (side panel on desktop/tablet, bottom sheet on mobile). */
export async function openTab(page: Page, t: TestInfo, tab: 'info' | 'damage' | 'system') {
  if (isMobile(t)) {
    const sheetOpen = await page.getByRole('dialog').filter({ has: page.getByTestId(`tab-${tab}`) }).isVisible().catch(() => false);
    if (!sheetOpen) await page.getByTestId(`mobile-tab-${tab}`).click();
  }
  await page.getByTestId(`tab-${tab}`).last().click();
}

/**
 * Asserts the WebGL canvas actually rendered geometry: a blank/uniform canvas compresses to a
 * tiny PNG, while a rendered suspension produces a large one.
 */
export async function expectCanvasRendered(page: Page) {
  const canvas = page.locator('[data-testid=viewer] canvas').first();
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(500);
  const png = await canvas.screenshot();
  expect(png.byteLength).toBeGreaterThan(25_000);
}
