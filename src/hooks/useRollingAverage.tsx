import { useCallback, useRef } from 'react';

// Keeps timestamped samples (value:number) and computes average over last `windowMs`.
export function useRollingAverage(windowMs = 10 * 60 * 1000) {
  const bufRef = useRef<Array<{ t: number; v: number }>>([]);

  const push = useCallback((value: number, now = Date.now()) => {
    const buf = bufRef.current;
    buf.push({ t: now, v: value });
    const cutoff = now - windowMs;
    // drop old
    while (buf.length && buf[0].t < cutoff) buf.shift();
  }, [windowMs]);

  const average = useCallback((now = Date.now()) => {
    const cutoff = now - windowMs;
    const buf = bufRef.current.filter((s) => s.t >= cutoff);
    if (!buf.length) return 0;
    const sum = buf.reduce((acc, x) => acc + x.v, 0);
    return sum / buf.length;
  }, [windowMs]);

  const reset = useCallback(() => (bufRef.current = []), []);

  return { push, average, reset, _bufRef: bufRef } as const;
}
