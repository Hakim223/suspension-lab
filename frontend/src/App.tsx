import SuspensionViewer from './components/viewer/SuspensionViewer';
import { useSuspension } from './hooks/useSuspension';
import { useLab } from './state/labStore';

export default function App() {
  const id = new URLSearchParams(location.search).get('s') ?? 'macpherson';
  const v = useSuspension(id)!;
  const names = new Map(v.components.map((c) => [c.id, c.displayName]));
  const includes = new Map(v.components.map((c) => [c.id, c.includes]));
  (window as unknown as { lab: typeof useLab }).lab = useLab;
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <SuspensionViewer modelKey={v.suspension.modelKey} steerable={v.suspension.steerable} names={names} includes={includes} damageScenario={null} />
    </div>
  );
}
