import { expect, test } from '@playwright/test';
import { expectCanvasRendered, isDesktop, isMobile, openExplorer, openTab, pickComponentFromList } from './helpers';

test.describe('Suspension Lab — main customer journey', () => {
  test('open app, choose a suspension, 3D model loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Kenali kaki-kaki mobil');
    await page.getByTestId('card-macpherson').click();
    await expect(page).toHaveURL(/\/jelajah\/macpherson$/);
    await expect(page.getByTestId('viewer')).toHaveAttribute('data-model-ready', 'true', { timeout: 30_000 });
    await expectCanvasRendered(page);
  });

  test('select a component from the list and read its information', async ({ page }, t) => {
    await openExplorer(page, 'double-wishbone');
    await pickComponentFromList(page, t, 'upper-control-arm');
    if (isMobile(t)) await expect(page.getByRole('dialog', { name: 'Komponen' })).toBeVisible();
    const title = page.getByTestId('component-info-title').last();
    await expect(title).toHaveText('Lengan Atas (Upper Control Arm)');
    const info = page.getByTestId('component-info').last();
    await expect(info.getByText('Cara Mekanik Memeriksa')).toBeVisible();
  });

  test('tap a part directly in the 3D view to select it', async ({ page }, t) => {
    test.skip(isMobile(t), 'labels hidden by default on phones; covered on desktop/tablet');
    await openExplorer(page, 'macpherson');
    // Label dots are placed at the projected centre of each part; tap the strut mount there.
    const dot = page.locator('[data-dot=strut-mount]');
    await expect(dot).toBeVisible();
    const box = (await dot.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByTestId('component-info-title').last()).toHaveText('Strut Mount (Support Strut)');
  });

  test('run the mechanical animation (play, speed, scrub, manual)', async ({ page }, t) => {
    await openExplorer(page, 'macpherson');
    const controls = page.getByTestId('animation-controls');
    await controls.getByTestId('speed-2').click();
    await controls.getByTestId('play-toggle').click();
    await expect(controls.getByTestId('play-toggle')).toHaveAttribute('aria-label', 'Jeda animasi');
    await expect.poll(async () => Number(await controls.getByTestId('timeline-scrubber').inputValue()), { timeout: 10_000 }).toBeGreaterThan(0.5);
    await controls.getByTestId('play-toggle').click();
    // Scrub to the moment the wheel is on the speed hump -> suspension compresses.
    await controls.getByTestId('timeline-scrubber').fill('0.78');
    if (!isMobile(t)) await expect(controls.getByTestId('readout')).toContainText(/Kanan: \+\d{2} mm \(tertekan\)/);
    // Manual mode with steering
    await controls.getByRole('radio', { name: 'Manual' }).click();
    await controls.getByTestId('manual-steer').fill('80');
    if (!isMobile(t)) await expect(controls.getByTestId('readout')).toContainText('Setir: 80%');
    await expectCanvasRendered(page);
  });

  test('exploded view, labels, focus and camera reset', async ({ page }) => {
    await openExplorer(page, 'multi-link');
    await page.getByTestId('toggle-exploded').click();
    await expect(page.getByTestId('toggle-exploded')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('toggle-labels').click();
    await page.getByTestId('reset-camera').click();
    await page.getByTestId('toggle-exploded').click();
    await expect(page.getByTestId('toggle-exploded')).toHaveAttribute('aria-pressed', 'false');
    await expectCanvasRendered(page);
  });

  test('hide and show a component', async ({ page }, t) => {
    await openExplorer(page, 'rigid-axle');
    if (!isDesktop(t)) await page.getByTestId('open-components').click();
    await page.getByTestId('toggle-visibility-wheel-assembly').click();
    await expect(page.getByTestId('toggle-visibility-wheel-assembly')).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Tampilkan semua' }).click();
    await expect(page.getByTestId('toggle-visibility-wheel-assembly')).toHaveAttribute('aria-pressed', 'false');
  });

  test('activate a damage simulation and compare normal vs damaged', async ({ page }, t) => {
    await openExplorer(page, 'macpherson');
    await openTab(page, t, 'damage');
    await page.getByTestId('scenario-ball-joint-play').last().click();
    await expect(page.getByTestId('damage-detail').last()).toBeVisible();
    if (isMobile(t)) await page.getByRole('button', { name: 'Tutup' }).last().click();
    const legend = page.getByTestId('compare-legend');
    await expect(legend).toContainText('Kanan: disimulasikan rusak');
    if (isMobile(t)) await openTab(page, t, 'damage');
    await page.getByRole('radio', { name: 'Normal' }).last().click();
    if (isMobile(t)) await page.getByRole('button', { name: 'Tutup' }).last().click();
    await expect(legend).toContainText('Kanan: normal');
    await expectCanvasRendered(page);
  });

  test('switch to another suspension type', async ({ page }, t) => {
    await openExplorer(page, 'macpherson');
    if (isDesktop(t)) await page.getByTestId('select-suspension-torsion-beam').click();
    else await page.getByTestId('suspension-select-mobile').selectOption('torsion-beam');
    await expect(page.getByTestId('explorer')).toHaveAttribute('data-suspension', 'torsion-beam');
    await expect(page.getByTestId('viewer')).toHaveAttribute('data-model-ready', 'true');
    if (!isDesktop(t)) await page.getByTestId('open-components').click();
    await expect(page.getByTestId('component-torsion-beam')).toBeVisible();
    await expect(page.getByTestId('component-strut-mount')).toHaveCount(0);
    await expectCanvasRendered(page);
  });

  test('all five architectures render', async ({ page }) => {
    // Five full scene loads under software (SwiftShader) WebGL in CI is slow; real GPUs are much faster.
    test.setTimeout(240_000);
    for (const id of ['macpherson', 'double-wishbone', 'torsion-beam', 'multi-link', 'rigid-axle']) {
      await openExplorer(page, id);
      await expectCanvasRendered(page);
    }
  });
});

test.describe('Resilience', () => {
  test('is fully static: no requests to any API or third-party host except fonts', async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const external: string[] = [];
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (u.protocol.startsWith('http') && u.origin !== origin && !/^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) external.push(r.url());
    });
    await page.goto('/jelajah/macpherson');
    await expect(page.getByTestId('viewer')).toHaveAttribute('data-model-ready', 'true', { timeout: 30_000 });
    await page.goto('/kuis');
    expect(external).toEqual([]);
  });

  test('falls back to a non-3D educational interface without WebGL', async ({ page }, t) => {
    await page.goto('/jelajah/macpherson?no3d=1');
    await expect(page.getByTestId('viewer-fallback')).toBeVisible();
    await page.getByTestId('viewer-fallback').getByRole('button', { name: /Ball Joint Bawah/ }).click();
    if (isMobile(t)) await page.getByTestId('mobile-tab-info').click();
    await expect(page.getByTestId('component-info-title').last()).toHaveText('Ball Joint Bawah');
  });
});

test.describe('GLB asset pipeline', () => {
  test('loads GLB models over HTTP and binds every part', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (m) => m.type() === 'warning' && m.text().includes('[model]') && warnings.push(m.text()));
    const glb = page.waitForResponse((r) => r.url().endsWith('/models/reference/double-wishbone.glb') && r.status() === 200);
    await page.goto('/jelajah/double-wishbone?model=glb');
    await glb;
    await expect(page.locator('html')).toHaveAttribute('data-model-source', 'glb', { timeout: 30_000 });
    await expectCanvasRendered(page);
    expect(warnings).toEqual([]);
  });
});

test.describe('Learning pages', () => {
  test('learn page and quiz', async ({ page }) => {
    await page.goto('/belajar');
    await expect(page.getByRole('heading', { name: 'Dasar-dasar suspensi' })).toBeVisible();
    await page.goto('/kuis');
    await page.getByTestId('quiz-option-1').click();
    await expect(page.getByRole('status')).toContainText(/Benar|Kurang tepat/);
    await page.getByTestId('quiz-next').click();
    await expect(page.getByText('Pertanyaan 2 dari 10')).toBeVisible();
  });
});
