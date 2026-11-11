import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt } from './renderApp';
import { useLab } from '../state/labStore';

// jsdom has no WebGL, so the explorer renders its accessible non-3D fallback. All panels,
// selection, damage and animation state are shared with the 3D viewer.
describe('Explorer (fallback renderer)', () => {
  beforeEach(() => useLab.getState().resetForSuspension());

  it('renders the selected architecture with its own component set', async () => {
    renderAt('/jelajah/macpherson');
    const list = await screen.findByTestId('component-list');
    expect(within(list).getByTestId('component-strut-mount')).toBeInTheDocument();
    expect(within(list).queryByTestId('component-upper-control-arm')).toBeNull();
    expect(screen.getByTestId('viewer-fallback')).toBeInTheDocument();
  });

  it('switches suspension type from the selector', async () => {
    const user = userEvent.setup();
    renderAt('/jelajah/macpherson');
    await user.click(await screen.findByTestId('select-suspension-torsion-beam'));
    await waitFor(() => expect(screen.getByTestId('explorer')).toHaveAttribute('data-suspension', 'torsion-beam'));
    const list = screen.getByTestId('component-list');
    expect(within(list).getByTestId('component-torsion-beam')).toBeInTheDocument();
    expect(within(list).queryByTestId('component-strut-mount')).toBeNull();
  });

  it('selecting a component shows its full information panel', async () => {
    const user = userEvent.setup();
    renderAt('/jelajah/double-wishbone');
    await user.click(await screen.findByTestId('component-ball-joint'));
    const info = await screen.findByTestId('component-info');
    expect(within(info).getByTestId('component-info-title')).toHaveTextContent('Ball Joint Atas & Bawah');
    for (const heading of ['Fungsi', 'Cara Kerja', 'Lokasi', 'Kerusakan yang Umum', 'Gejala yang Mungkin Dirasakan', 'Akibat Bila Dibiarkan', 'Cara Mekanik Memeriksa']) {
      expect(within(info).getByText(heading)).toBeInTheDocument();
    }
    expect(useLab.getState().selectedComponentId).toBe('ball-joint');
  });

  it('hides and shows a component', async () => {
    const user = userEvent.setup();
    renderAt('/jelajah/macpherson');
    await user.click(await screen.findByTestId('toggle-visibility-wheel-assembly'));
    expect(useLab.getState().hidden['wheel-assembly']).toBe(true);
    await user.click(screen.getByText('Tampilkan semua'));
    expect(useLab.getState().hidden['wheel-assembly']).toBeFalsy();
  });

  it('starts a damage simulation from the component panel', async () => {
    const user = userEvent.setup();
    renderAt('/jelajah/macpherson');
    await user.click(await screen.findByTestId('component-strut-mount'));
    await user.click(await screen.findByTestId('simulate-strut-mount-worn'));
    const s = useLab.getState();
    expect(s.damageScenarioId).toBe('strut-mount-worn');
    expect(s.mode).toBe('steer');
    expect(s.playing).toBe(true);
    expect(await screen.findByTestId('damage-detail')).toBeInTheDocument();
  });

  it('only offers damage scenarios whose component exists in the architecture', async () => {
    const user = userEvent.setup();
    renderAt('/jelajah/torsion-beam');
    await user.click(await screen.findByTestId('tab-damage'));
    const panel = screen.getByTestId('damage-panel');
    expect(within(panel).getByTestId('scenario-weak-shock')).toBeInTheDocument();
    expect(within(panel).queryByTestId('scenario-ball-joint-play')).toBeNull();
    expect(within(panel).getByText(/Tidak tersedia pada sistem ini/)).toBeInTheDocument();
  });

  it('animation controls drive the simulation state', async () => {
    const user = userEvent.setup();
    renderAt('/jelajah/macpherson');
    const controls = await screen.findByTestId('animation-controls');
    await user.click(within(controls).getByRole('radio', { name: 'Jalan bergelombang' }));
    expect(useLab.getState().mode).toBe('rough');
    expect(useLab.getState().playing).toBe(true);
    await user.click(within(controls).getByTestId('play-toggle'));
    expect(useLab.getState().playing).toBe(false);
    await user.click(within(controls).getByTestId('speed-0.5'));
    expect(useLab.getState().speed).toBe(0.5);
    await user.click(within(controls).getByRole('radio', { name: 'Manual' }));
    expect(within(controls).getByTestId('manual-steer')).toBeInTheDocument();
  });

  it('disables steering mode for non-steered rear suspensions', async () => {
    renderAt('/jelajah/rigid-axle');
    const controls = await screen.findByTestId('animation-controls');
    expect(within(controls).getByRole('radio', { name: 'Belok' })).toBeDisabled();
  });

  it('shows the system overview with pros and cons', async () => {
    const user = userEvent.setup();
    renderAt('/jelajah/multi-link');
    await user.click(await screen.findByTestId('tab-system'));
    const ov = screen.getByTestId('suspension-overview');
    expect(within(ov).getByText('Kelebihan')).toBeInTheDocument();
    expect(within(ov).getByText('Kekurangan')).toBeInTheDocument();
  });
});

describe('Home, learn & quiz pages', () => {
  it('consumer home lists all five architectures', async () => {
    renderAt('/consumer');
    for (const id of ['macpherson', 'double-wishbone', 'torsion-beam', 'multi-link', 'rigid-axle']) {
      expect(await screen.findByTestId(`card-${id}`)).toHaveAttribute('href', `/jelajah/${id}`);
    }
  });

  it('quiz can be completed with a score', async () => {
    const user = userEvent.setup();
    renderAt('/kuis');
    for (let i = 0; i < 10; i++) {
      await user.click(await screen.findByTestId('quiz-option-0'));
      await user.click(screen.getByTestId('quiz-next'));
    }
    expect(await screen.findByTestId('quiz-result')).toHaveTextContent(/Skor Anda: \d+ \/ 10/);
  });

  it('unknown routes show the not-found page', async () => {
    renderAt('/tidak-ada');
    expect(await screen.findByText('Halaman tidak ditemukan')).toBeInTheDocument();
  });
});
