import type { SteeringSystemId } from '../data/types';
import type { SteeringOutput } from './steeringModel';
import { MAX_SW_DEG } from './steeringModel';

interface Props {
  system: SteeringSystemId;
  epsVariant: number;
  swDeg: number;
  pinionDeg: number;
  out: SteeringOutput;
  failedIds: string[];
  selectedId: string | null;
  flowPhase: number;
  noise?: string;
  onPick: (schematicId: string) => void;
}

const C = { line: '#2b3d5c', ink: '#b4c2d8', muted: '#8496b0', steel: '#9aa5b5', fail: '#f87171', sel: '#f5a524', hp: '#ef4444', ret: '#38bdf8', sig: '#a78bfa' };

/**
 * Top-view schematic of a rack-and-pinion system (not to scale). Positions follow the simplified
 * steering model: rack travel from pinion angle, road-wheel angles with Ackermann from rack travel.
 */
export function SteeringSchematic({ system, epsVariant, swDeg, pinionDeg, out, failedIds, selectedId, flowPhase, noise, onPick }: Props) {
  const stroke = (id: string, base = C.steel) => (failedIds.includes(id) ? C.fail : selectedId === id ? C.sel : base);
  const sw = (id: string) => (failedIds.includes(id) || selectedId === id ? 3 : 1.6);
  const pick = (id: string) => ({ onClick: () => onPick(id), style: { cursor: 'pointer' }, 'data-schematic': id });
  const shift = out.rackMm * 1.35;
  const road = out.roadWheelDeg;
  // Ackermann: the inner wheel turns more. Positive road angle = left turn (rack moves right).
  const leftDeg = road > 0 ? road * 1.1 : road * 0.92;
  const rightDeg = road > 0 ? road * 0.92 : road * 1.1;
  const L = { cx: 105, deg: leftDeg };
  const R = { cx: 695, deg: rightDeg };
  const rackL = 230 + shift;
  const rackR = 570 + shift;
  const tieL = { x: 150 + Math.sin((leftDeg * Math.PI) / 180) * 26, y: 356 };
  const tieR = { x: 650 + Math.sin((rightDeg * Math.PI) / 180) * 26, y: 356 };
  const pressure = out.pressureMPa ?? 0;
  const pFrac = Math.min(1, pressure / 9);
  const dash = { strokeDasharray: '10 8', strokeDashoffset: -flowPhase * 40 };
  const hpsActive = system === 'hps';
  const eps = system === 'eps';
  const variant = epsVariant; // 0 column, 1 pinion, 2 rack

  return (
    <svg viewBox="0 0 800 470" className="h-full w-full" role="img" aria-label="Skema sistem kemudi (tampak atas, tidak berskala)" data-testid="steering-schematic">
      <rect x="0" y="0" width="800" height="470" fill="#0b1220" />
      <text x="12" y="22" fill={C.muted} fontSize="12" fontFamily="JetBrains Mono, monospace">SKEMA · TAMPAK ATAS · TIDAK BERSKALA</text>

      {/* Steering wheel + angle sensor + column */}
      <g transform={`translate(400 78) rotate(${swDeg})`} {...pick('wheel')}>
        <circle r="44" fill="none" stroke={C.ink} strokeWidth="6" />
        <line x1="-44" y1="0" x2="44" y2="0" stroke={C.ink} strokeWidth="4" />
        <line x1="0" y1="0" x2="0" y2="44" stroke={C.ink} strokeWidth="4" />
        <circle r="9" fill={C.ink} />
        <rect x="-3" y="-50" width="6" height="12" fill={C.sel} />
      </g>
      <g {...pick('column')}>
        <line x1="400" y1="122" x2="400" y2="186" stroke={stroke('column', C.ink)} strokeWidth={sw('column') + 2} />
      </g>
      {eps && (
        <g {...pick('angle-sensor')}>
          <rect x="378" y="124" width="44" height="12" rx="3" fill="#1e293b" stroke={stroke('angle-sensor', C.sig)} strokeWidth={sw('angle-sensor')} />
          <text x="430" y="134" fill={C.muted} fontSize="11">SAS</text>
        </g>
      )}
      {eps && (
        <g {...pick('torque-sensor')}>
          <rect x="384" y="150" width="32" height="18" rx="4" fill="#1e293b" stroke={stroke('torque-sensor', C.sig)} strokeWidth={sw('torque-sensor')} />
          <text x="424" y="164" fill={C.muted} fontSize="11">sensor torsi</text>
        </g>
      )}
      <g {...pick('shaft')}>
        <line x1="400" y1="186" x2="400" y2="246" stroke={stroke('shaft', C.ink)} strokeWidth={sw('shaft') + 2} />
        <g transform="translate(400 200)">
          <circle r="7" fill="none" stroke={stroke('shaft', C.ink)} strokeWidth={sw('shaft')} />
          <line x1="-7" y1="0" x2="7" y2="0" stroke={stroke('shaft', C.ink)} />
        </g>
        <text x="410" y="204" fill={C.muted} fontSize="11">U-joint</text>
      </g>
      <g {...pick('coupling')}>
        <rect x="390" y="230" width="20" height="9" rx="2" fill="#1e293b" stroke={stroke('coupling', C.ink)} strokeWidth={sw('coupling')} />
        <text x="416" y="239" fill={C.muted} fontSize="11">kopling</text>
      </g>

      {/* Rack housing, mounts, bellows */}
      <g {...pick('housing')}>
        <rect x="215" y="262" width="370" height="36" rx="8" fill="#111a2b" stroke={stroke('housing', C.line)} strokeWidth={sw('housing') + 0.5} />
      </g>
      {[250, 550].map((x) => (
        <g key={x} {...pick('mounts')}>
          <rect x={x - 14} y="250" width="28" height="12" rx="3" fill="#1b1d22" stroke={stroke('mounts', C.muted)} strokeWidth={sw('mounts')} />
        </g>
      ))}
      {/* Hydraulic cylinder chambers (HPS) */}
      {hpsActive && (
        <g {...pick('cylinder')}>
          <rect x="280" y="266" width="112" height="28" fill={road >= 0 ? `rgba(239,68,68,${0.15 + pFrac * 0.6})` : 'rgba(56,189,248,0.12)'} stroke={stroke('cylinder', C.line)} strokeWidth={sw('cylinder')} />
          <rect x="408" y="266" width="112" height="28" fill={road < 0 ? `rgba(239,68,68,${0.15 + pFrac * 0.6})` : 'rgba(56,189,248,0.12)'} stroke={stroke('cylinder', C.line)} strokeWidth={sw('cylinder')} />
          <rect x={393 + shift * 0.2} y="266" width="14" height="28" fill={C.steel} />
        </g>
      )}
      {/* Rack bar with teeth */}
      <g {...pick('rack')}>
        <rect x={rackL} y="275" width={rackR - rackL} height="10" rx="3" fill={stroke('rack', '#7c8798')} />
        {Array.from({ length: 13 }, (_, i) => (
          <rect key={i} x={350 + i * 8 + (shift % 8)} y="271" width="4" height="4" fill={stroke('rack', '#a8b2c1')} />
        ))}
      </g>
      {/* Pinion + rack guide */}
      <g transform={`translate(400 260) rotate(${pinionDeg})`} {...pick('pinion')}>
        <circle r="13" fill="#1e293b" stroke={stroke('pinion', C.ink)} strokeWidth={sw('pinion')} />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="-2" y="-16" width="4" height="5" fill={stroke('pinion', C.ink)} transform={`rotate(${i * 45})`} />
        ))}
      </g>
      <g {...pick('guide')}>
        <rect x="388" y="300" width="24" height="12" rx="2" fill="#1e293b" stroke={stroke('guide', C.ink)} strokeWidth={sw('guide')} />
        <polyline points="392,312 408,316 392,320 408,324 392,328" fill="none" stroke={stroke('guide', C.ink)} strokeWidth="1.5" />
        <text x="416" y="324" fill={C.muted} fontSize="11">rack guide + pegas</text>
      </g>

      {/* Inner tie rods (bellows) + tie rods + outer ends */}
      {[{ x: rackL, t: tieL }, { x: rackR, t: tieR }].map(({ x, t }, i) => (
        <g key={i}>
          <g {...pick('inner-tie-rod')}>
            <polyline points={`${x},272 ${x + (i ? 8 : -8)},288 ${x + (i ? 16 : -16)},272 ${x + (i ? 24 : -24)},288`} fill="none" stroke={C.muted} strokeWidth="1.5" />
            <circle cx={x} cy="280" r="6" fill="#1e293b" stroke={stroke('inner-tie-rod', C.ink)} strokeWidth={sw('inner-tie-rod')} />
          </g>
          <line x1={x} y1="280" x2={t.x} y2={t.y} stroke={stroke('tie-rod-end', C.steel)} strokeWidth="4" />
          <g {...pick('tie-rod-end')}>
            <circle cx={t.x} cy={t.y} r="7" fill="#1e293b" stroke={stroke('tie-rod-end', C.ink)} strokeWidth={sw('tie-rod-end')} />
          </g>
        </g>
      ))}
      {/* Wheels (rotate about kingpin) */}
      {[L, R].map((w, i) => (
        <g key={i} transform={`translate(${w.cx} 330) rotate(${-w.deg})`}>
          <rect x="-16" y="-46" width="32" height="92" rx="7" fill="#16181c" stroke={C.muted} />
          <line x1="0" y1="-46" x2="0" y2="-62" stroke={C.sel} strokeWidth="2" />
          <line x1={i ? -16 : 16} y1="0" x2={i ? -44 : 44} y2="24" stroke={C.steel} strokeWidth="4" />
        </g>
      ))}

      {/* HPS circuit */}
      {hpsActive && (
        <g>
          <g {...pick('reservoir')}>
            <rect x="92" y="44" width="58" height="40" rx="5" fill="#0f1726" stroke={stroke('reservoir', C.ret)} strokeWidth={sw('reservoir')} />
            <rect x="96" y="60" width="50" height="20" fill="rgba(56,189,248,0.35)" />
            <text x="96" y="38" fill={C.muted} fontSize="11">reservoir</text>
          </g>
          <g {...pick('pump')}>
            <circle cx="122" cy="150" r="24" fill="#0f1726" stroke={stroke('pump', C.ink)} strokeWidth={sw('pump')} />
            <text x="152" y="154" fill={C.muted} fontSize="11">pompa</text>
          </g>
          <g {...pick('pulley')}>
            <circle cx="122" cy="150" r="10" fill="none" stroke={stroke('pulley', C.muted)} strokeWidth={sw('pulley')} strokeDasharray="4 3" transform={`rotate(${flowPhase * 360} 122 150)`} />
          </g>
          <g {...pick('hoses')}>
            <path d="M146 150 C 250 150, 300 215, 384 246" fill="none" stroke={stroke('hoses', C.hp)} strokeWidth="4" {...dash} />
            <path d="M 416 246 C 520 200, 260 100, 150 74" fill="none" stroke={stroke('hoses', C.ret)} strokeWidth="3" {...dash} />
            <path d="M122 126 L122 84" fill="none" stroke={C.ret} strokeWidth="3" {...dash} />
            <text x="232" y="168" fill={C.hp} fontSize="11">tekanan tinggi</text>
            <text x="250" y="110" fill={C.ret} fontSize="11">kembali</text>
          </g>
          <g {...pick('valve')}>
            <rect x="380" y="240" width="40" height="12" rx="3" fill="#1e293b" stroke={stroke('valve', C.hp)} strokeWidth={sw('valve')} />
            <text x="428" y="250" fill={C.muted} fontSize="11">katup putar</text>
          </g>
          <text x="560" y="430" fill={C.ink} fontSize="13" fontFamily="JetBrains Mono, monospace">p = {pressure.toFixed(1)} MPa</text>
        </g>
      )}

      {/* EPS */}
      {eps && (
        <g>
          <g {...pick('ecu')}>
            <rect x="560" y="120" width="70" height="40" rx="5" fill="#0f1726" stroke={stroke('ecu', C.sig)} strokeWidth={sw('ecu')} />
            <text x="578" y="145" fill={C.ink} fontSize="12">ECU</text>
          </g>
          <g {...pick('ecu')}>
            <rect x="680" y="40" width="70" height="30" rx="4" fill="#0f1726" stroke={stroke('ecu', C.muted)} strokeWidth={sw('ecu')} />
            <text x="694" y="60" fill={C.ink} fontSize="11">12 V</text>
            <path d="M715 70 L 610 120" stroke={C.muted} strokeWidth="2" />
          </g>
          {(() => {
            const m = variant === 0 ? { x: 470, y: 176, tx: 400, ty: 176 } : variant === 1 ? { x: 470, y: 228, tx: 412, ty: 252 } : { x: 470, y: 330, tx: 470, ty: 292 };
            return (
              <g>
                <path d={`M560 150 L ${m.x + 20} ${m.y}`} stroke={C.sig} strokeWidth="1.5" strokeDasharray="5 4" strokeDashoffset={-flowPhase * 30} />
                <path d="M560 130 L 422 160" stroke={C.sig} strokeWidth="1.5" strokeDasharray="5 4" />
                <g {...pick('motor')}>
                  <rect x={m.x} y={m.y - 14} width="46" height="28" rx="6" fill="#1e293b" stroke={stroke('motor', C.sig)} strokeWidth={sw('motor')} />
                  <text x={m.x + 6} y={m.y + 5} fill={C.ink} fontSize="11">motor</text>
                </g>
                <g {...pick('reduction')}>
                  <line x1={m.x} y1={m.y} x2={m.tx} y2={m.ty} stroke={stroke('reduction', C.sel)} strokeWidth={sw('reduction') + 2} />
                  <text x={m.x - 4} y={m.y + 30} fill={C.muted} fontSize="11">{variant === 2 ? 'sabuk + ball-nut' : 'worm gear'}</text>
                </g>
              </g>
            );
          })()}
        </g>
      )}

      {/* Readouts */}
      <g fontFamily="JetBrains Mono, monospace" fontSize="12" fill={C.ink}>
        <text x="12" y="430">setir {swDeg.toFixed(0)}° · pinion {pinionDeg.toFixed(0)}° · rack {out.rackMm.toFixed(1)} mm</text>
        <text x="12" y="450">roda kiri {leftDeg.toFixed(1)}° · kanan {rightDeg.toFixed(1)}° (Ackermann)</text>
        {Math.abs(swDeg - pinionDeg) > 0.5 && <text x="12" y="410" fill={C.fail}>celah bebas: setir bergerak {Math.abs(swDeg - pinionDeg).toFixed(1)}° tanpa diikuti pinion</text>}
        {noise && <text x="560" y="450" fill={C.sel}>♪ {noise}</text>}
      </g>
      <text x="12" y="40" fill={C.muted} fontSize="11">± {MAX_SW_DEG}° setir = ± 35° roda</text>
    </svg>
  );
}

export function TorqueChart({ normal, failed, current }: { normal: Array<{ sw: number; t: number }>; failed: Array<{ sw: number; t: number }>; current?: { sw: number; t: number } }) {
  const W = 360;
  const H = 170;
  const maxT = Math.max(8, ...normal.map((p) => p.t), ...failed.map((p) => p.t)) * 1.1;
  const x = (sw: number) => 34 + (sw / MAX_SW_DEG) * (W - 44);
  const y = (t: number) => H - 24 - (t / maxT) * (H - 40);
  const path = (pts: Array<{ sw: number; t: number }>) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.sw).toFixed(1)} ${y(p.t).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Grafik torsi setir terhadap sudut setir" data-testid="torque-chart">
      <line x1="34" y1={H - 24} x2={W - 8} y2={H - 24} stroke="#2b3d5c" />
      <line x1="34" y1="10" x2="34" y2={H - 24} stroke="#2b3d5c" />
      {[0, 0.5, 1].map((f) => (
        <text key={f} x="4" y={y(maxT * f) + 4} fill="#8496b0" fontSize="10" fontFamily="JetBrains Mono, monospace">{(maxT * f).toFixed(0)}</text>
      ))}
      <text x={W - 120} y={H - 8} fill="#8496b0" fontSize="10">sudut setir (°) →</text>
      <text x="38" y="18" fill="#8496b0" fontSize="10">torsi pengemudi (Nm)</text>
      <path d={path(normal)} fill="none" stroke="#34d399" strokeWidth="2" strokeDasharray="5 4" />
      <path d={path(failed)} fill="none" stroke="#f5a524" strokeWidth="2.5" />
      {current && <circle cx={x(Math.abs(current.sw))} cy={y(current.t)} r="4.5" fill="#f5a524" />}
      <g fontSize="10.5">
        <line x1={W - 150} y1="20" x2={W - 132} y2="20" stroke="#34d399" strokeWidth="2" strokeDasharray="5 4" />
        <text x={W - 128} y="24" fill="#b4c2d8">normal</text>
        <line x1={W - 80} y1="20" x2={W - 62} y2="20" stroke="#f5a524" strokeWidth="2.5" />
        <text x={W - 58} y="24" fill="#b4c2d8">gagal</text>
      </g>
    </svg>
  );
}
