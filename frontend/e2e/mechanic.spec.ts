import { expect, test } from '@playwright/test';
import { expectCanvasRendered, isDesktop, isMobile } from './helpers';

test.describe('Dual mode', () => {
  test('direct URL access to /consumer and /mechanic works', async ({ page }) => {
    await page.goto('/consumer');
    await expect(page.getByTestId('card-macpherson')).toBeVisible();
    await page.goto('/mechanic');
    await expect(page.getByTestId('mechanic-home')).toBeVisible();
    await page.goto('/mechanic/arsitektur/rigid-axle');
    await expect(page.getByTestId('workbench')).toBeVisible();
  });

  test('landing → Mechanic Mode → switch to Consumer keeps the architecture', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('enter-mechanic').click();
    await expect(page).toHaveURL(/\/mechanic$/);
    await page.getByTestId('arch-double-wishbone').click();
    await expect(page.getByTestId('viewer')).toHaveAttribute('data-model-ready', 'true', { timeout: 30_000 });
    await page.getByTestId('mode-consumer').click();
    await expect(page).toHaveURL(/\/jelajah\/double-wishbone$/);
    await expect(page.getByTestId('explorer')).toHaveAttribute('data-suspension', 'double-wishbone');
    await page.getByTestId('mode-mechanic').click();
    await expect(page).toHaveURL(/\/mechanic\/arsitektur\/double-wishbone$/);
  });
});

test.describe('Mechanic Mode', () => {
  test('workbench: select component → subcomponent → failure, simulate, compare, reset', async ({ page }, t) => {
    await page.goto('/mechanic/arsitektur/macpherson');
    await expect(page.getByTestId('viewer')).toHaveAttribute('data-model-ready', 'true', { timeout: 30_000 });
    if (!isDesktop(t)) await page.getByTestId('open-tree').click();
    await page.getByTestId('tree-control-arm-bushing').click();
    if (!isDesktop(t)) {
      if (isMobile(t)) await page.getByRole('button', { name: 'Tutup' }).last().click();
      if (isMobile(t)) await page.getByTestId('mobile-mtab-failure').click();
      else { await page.getByRole('button', { name: 'Tutup' }).last().click(); await page.getByTestId('mtab-failure').click(); }
    } else await page.getByTestId('mtab-failure').click();
    await page.getByTestId('failure-tearing').last().click();
    await expect(page.getByTestId('failure-title').last()).toHaveText('Karet sobek');
    await expect(page.getByTestId('toggle-sim').last()).toBeVisible();
    if (isMobile(t)) await page.getByRole('button', { name: 'Tutup' }).last().click();
    await expect(page.getByTestId('compare-legend')).toContainText('disimulasikan rusak');
    await expectCanvasRendered(page);
    if (isMobile(t)) await page.getByTestId('mobile-mtab-failure').click();
    await page.getByTestId('reset-sim').last().click();
    if (isMobile(t)) await page.getByRole('button', { name: 'Tutup' }).last().click();
    await expect(page.getByTestId('compare-legend')).toHaveCount(0);
  });

  test('steering module: mechanical, HPS and EPS with failure effects', async ({ page }) => {
    await page.goto('/mechanic/kemudi');
    await page.getByTestId('steer-part-rack-gear').click();
    await page.getByTestId('steer-failure-rack-wear').click();
    await page.getByTestId('steer-angle').fill('40');
    await expect(page.getByTestId('steering-schematic')).toBeVisible();
    await page.getByTestId('steer-hps').click();
    await expect(page).toHaveURL(/\/mechanic\/kemudi\/hps$/);
    await page.getByTestId('steer-part-ps-pump').click();
    await page.getByTestId('steer-failure-pump-wear').click();
    await expect(page.getByTestId('failure-title')).toContainText('Pompa aus');
    await page.getByTestId('steer-eps').click();
    await page.getByTestId('steer-part-eps-torque-sensor').click();
    await page.getByTestId('steer-failure-torque-offset').click();
    await expect(page.getByTestId('pull-warning')).toBeVisible();
  });

  test('anatomy: assembled / exploded / cutaway with a failure overlay', async ({ page }) => {
    await page.goto('/mechanic/anatomi/ball-joint');
    for (const v of ['Rakitan', 'Urai', 'Potongan']) await page.getByRole('radio', { name: v }).click();
    await page.getByTestId('anatomy-failure-axial-play').click();
    await expect(page.getByTestId('anatomy-failure-note')).toContainText('aksial');
    const canvas = page.locator('[data-testid=anatomy-viewport] canvas').first();
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(800);
    expect((await canvas.screenshot()).byteLength).toBeGreaterThan(15_000);
  });

  test('diagnostics: work through a case', async ({ page }) => {
    await page.goto('/mechanic/diagnosis');
    await page.getByTestId('case-filter').selectOption('setir-berat');
    await page.getByTestId('case-heavy-parking').click();
    await page.getByTestId('next-step').click();
    await page.getByTestId('cause-0').check();
    await page.getByTestId('check-hypotheses').click();
    await page.getByTestId('step-3').click();
    await expect(page.getByTestId('findings')).toContainText('Hasil pada kasus ini');
  });
});
