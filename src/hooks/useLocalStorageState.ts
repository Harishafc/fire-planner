import { useEffect, useState } from 'react';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Merges saved data onto defaults one level deep, so newly-added nested fields
 * (e.g. holdings.epf) fall back to their default instead of becoming undefined
 * when a browser has an older shape saved from before that field existed.
 */
function mergeWithDefaults<T>(defaults: T, saved: Partial<T>): T {
  if (!isPlainObject(defaults) || !isPlainObject(saved)) return { ...defaults, ...saved } as T;
  const result: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(saved)) {
    const savedVal = saved[key as keyof T];
    const defaultVal = defaults[key as keyof T];
    if (isPlainObject(defaultVal) && isPlainObject(savedVal)) {
      result[key] = { ...defaultVal, ...savedVal };
    } else if (savedVal !== undefined) {
      result[key] = savedVal;
    }
  }
  return result as T;
}

export function useLocalStorageState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return mergeWithDefaults(initial, JSON.parse(raw));
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
