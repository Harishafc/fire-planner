import { useEffect, useState } from 'react';

export function useLocalStorageState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return { ...initial, ...JSON.parse(raw) } as T;
    } catch {
      // ignore corrupt storage
    }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // storage unavailable, ignore
    }
  }, [key, state]);

  return [state, setState];
}
