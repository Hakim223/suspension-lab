import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt } from './renderApp';
import { useLab } from '../state/labStore';
import { useMechanic } from '../mechanic/state/mechanicStore';
import { switchTarget } from '../state/modeStore';

beforeEach(() => {
  useLab.getState().resetForSuspension();
  useMechanic.setState({ componentId: null, subcomponentId: null, failureId: null, simActive: false, steeringPartId: null, steeringFailureId: null, caseId: null });
});

describe('Landing & mode switching', () => {
  it('landing offers both modes', async () => {
    renderAt('/');
    expect(await screen.findByTestId('enter-consumer')).toHaveAttribute('href', '/consumer');
    expect(screen.getByTestId('enter-mechanic')).toHaveAttribute('href', '/mechanic');
  });

  it('switch maps the same architecture between modes', () => {
    const last = { consumer: '/consumer', mechanic: '/mechanic' };
    expect(switchTarget('mechanic', '/jelajah/double-wishbone', last)).toBe('/mechanic/arsitektur/double-wishbone');
    expect(switchTarget('consumer', '/mechanic/arsitektur/rigid-axle', last)).toBe('/jelajah/rigid-axle');
    expect(switchTarget('consumer', '/mechanic/kemudi', { ...last, consumer: '/kuis' })).toBe('/kuis');
  });

  it('switching from consumer explorer to mechanic keeps the architecture and selection', async () => {
    const user = userEvent.setup();
    renderAt('/jelajah/macpherson');
    await user.click(await screen.findByTestId('component-strut-mount'));
    await user.click(screen.getByTestId('mode-mechanic'));
    await waitFor(() => expect(screen.getByTestId('workbench')).toBeInTheDocument());
    expect(useLab.getState().selectedComponentId).toBe('strut-mount');
    expect(await screen.findByTestId('mech-component-detail')).toHaveTextContent('Strut Mount');
    await user.click(screen.getByTestId('mode-consumer'));
    await waitFor(() => expect(screen.getByTestId('explorer')).toHaveAttribute('data-suspension', 'macpherson'));
    expect(useLab.getState().selectedComponentId).toBe('strut-mount');
  });
});

describe('Mechanic Mode', () => {
  it('dashboard links all four modules and five architectures', async () => {
    renderAt('/mechanic');
    for (const m of ['M1', 'M2', 'M3', 'M4']) expect(await screen.findByTestId(`module-${m}`)).toBeInTheDocument();
    for (const a of ['macpherson', 'double-wishbone', 'torsion-beam', 'multi-link', 'rigid-axle']) expect(screen.getByTestId(`arch-${a}`)).toBeInTheDocument();
  });

  it('workbench: hierarchy → subcomponent → specific failure with six explanations and sim controls', async () => {
    const user = userEvent.setup();
    renderAt('/mechanic/arsitektur/macpherson');
    await user.click(await screen.findByTestId('tree-strut-mount'));
    await user.click(screen.getByTestId('sub-strut-bearing'));
    const list = screen.getByTestId('failure-list');
    expect(within(list).getByTestId('failure-bearing-wear')).toBeInTheDocument();
    expect(within(list).queryByTestId('failure-plate-damage')).toBeNull();
    await user.click(within(list).getByTestId('failure-bearing-seizure'));
    const d = screen.getByTestId('failure-detail');
    for (const h of ['1 · Apa yang gagal secara fisik', '2 · Mengapa terjadi', '3 · Perubahan gerak / perilaku mekanis', '4 · Yang dirasakan pengemudi', '5 · Yang harus diperiksa mekanik', '6 · Membedakan dari kegagalan serupa']) {
      expect(within(d).getByText(h)).toBeInTheDocument();
    }
    // Seizure has no honest geometric simulation → explanation instead
    expect(screen.getByTestId('no-sim-note')).toBeInTheDocument();
    await user.click(screen.getByTestId('failure-bearing-wear'));
    expect(screen.getByTestId('toggle-sim')).toBeInTheDocument();
    await waitFor(() => expect(useLab.getState().damageScenarioId).toBe('mech:strut-mount:bearing-wear'));
    await user.click(screen.getByTestId('reset-sim'));
    expect(useLab.getState().damageScenarioId).toBeNull();
  });

  it('architecture-specific hierarchy (torsion beam has no steering linkage)', async () => {
    renderAt('/mechanic/arsitektur/torsion-beam');
    expect(await screen.findByTestId('tree-torsion-beam')).toBeInTheDocument();
    expect(screen.queryByTestId('tree-outer-tie-rod-end')).toBeNull();
  });

  it('steering module: select HPS failure and see effort change', async () => {
    const user = userEvent.setup();
    renderAt('/mechanic/kemudi/hps');
    await user.click(await screen.findByTestId('steer-part-ps-reservoir'));
    await user.click(screen.getByTestId('steer-failure-low-fluid'));
    expect(screen.getByTestId('failure-title')).toHaveTextContent('Oli kurang');
    expect(screen.getByTestId('steering-schematic')).toBeInTheDocument();
    expect(screen.getByTestId('metric-torque')).toHaveTextContent('normal');
  });

  it('anatomy page lists parts and failures (WebGL-less fallback in jsdom)', async () => {
    const user = userEvent.setup();
    renderAt('/mechanic/anatomi/ball-joint');
    await user.click(await screen.findByTestId('anatomy-failure-radial-play'));
    expect(screen.getByTestId('failure-detail')).toBeInTheDocument();
    await user.click(screen.getByTestId('part-liner'));
    expect(screen.getByTestId('part-detail')).toHaveTextContent('polimer');
  });

  it('diagnostic case walks complaint → hypotheses → findings', async () => {
    const user = userEvent.setup();
    renderAt('/mechanic/diagnosis/clunk-bumps-mcpherson');
    await user.click(await screen.findByTestId('next-step'));
    await user.click(screen.getByTestId('cause-0'));
    await user.click(screen.getByTestId('check-hypotheses'));
    await user.click(screen.getByTestId('step-3'));
    expect(screen.getByTestId('findings')).toHaveTextContent('mencakup');
  });
});
