import { useSyncExternalStore } from 'react';
import { simClock } from '../three/sim/clock';

let version = 0;
const subscribe = (cb: () => void) => {
  const l = () => {
    version++;
    cb();
  };
  simClock.listeners.add(l);
  return () => simClock.listeners.delete(l);
};

/** Re-renders the caller ~12×/s while the simulation runs (throttled in the render loop). */
export function useSimClock() {
  useSyncExternalStore(subscribe, () => version);
  return simClock;
}
