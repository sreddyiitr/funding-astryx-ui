import {useCallback, useEffect, useState} from 'react';

export type AsyncState<T> =
  | {status: 'loading'; data?: T}
  | {status: 'error'; error: Error; data?: T}
  | {status: 'ready'; data: T};

/**
 * Runs `load` whenever `deps` change and ignores results from stale runs.
 * Keeps the previous data while reloading so the screen does not flash.
 */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> & {reload: () => void} {
  const [state, setState] = useState<AsyncState<T>>({status: 'loading'});
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setState(prev => ({status: 'loading', data: prev.data}));
    load().then(
      data => isCurrent && setState({status: 'ready', data}),
      (error: Error) => isCurrent && setState(prev => ({status: 'error', error, data: prev.data})),
    );
    return () => {
      isCurrent = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce(n => n + 1), []);
  return {...state, reload};
}

export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/** A string kept in the URL query (?key=value) so views can be shared and survive reload. */
export function useUrlParam(key: string): [string | null, (value: string | null) => void] {
  const read = () => new URLSearchParams(window.location.search).get(key);
  const [value, setValue] = useState<string | null>(read);

  useEffect(() => {
    const onPop = () => setValue(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: string | null) => {
      const url = new URL(window.location.href);
      if (next) url.searchParams.set(key, next);
      else url.searchParams.delete(key);
      window.history.pushState(null, '', url);
      setValue(next);
    },
    [key],
  );
  return [value, update];
}

/**
 * Several values kept in the URL query. Missing keys fall back to `defaults`; values equal to
 * their default are dropped from the URL so links stay short. Updates replace the history
 * entry (typing in a filter should not fill Back with keystrokes).
 */
export function useUrlState<T extends Record<string, string | null>>(
  defaults: T,
): [T, (patch: Partial<T>) => void] {
  const read = (): T => {
    const params = new URLSearchParams(window.location.search);
    const out = {...defaults};
    for (const key of Object.keys(defaults) as (keyof T & string)[]) {
      const v = params.get(key);
      if (v != null) out[key] = v as T[typeof key];
    }
    return out;
  };
  const [value, setValue] = useState<T>(read);

  useEffect(() => {
    const onPop = () => setValue(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback(
    (patch: Partial<T>) => {
      setValue(prev => {
        const next = {...prev, ...patch};
        const url = new URL(window.location.href);
        for (const key of Object.keys(defaults)) {
          const v = next[key];
          if (v == null || v === '' || v === defaults[key]) url.searchParams.delete(key);
          else url.searchParams.set(key, v);
        }
        window.history.replaceState(null, '', url);
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return [value, update];
}

export function useLocalStorage(key: string): [string | null, (value: string) => void] {
  const [value, setValue] = useState<string | null>(() => window.localStorage.getItem(key));
  const update = useCallback(
    (next: string) => {
      window.localStorage.setItem(key, next);
      setValue(next);
    },
    [key],
  );
  return [value, update];
}
