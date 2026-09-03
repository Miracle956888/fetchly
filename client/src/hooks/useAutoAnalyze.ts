import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiClientError } from '../lib/api';
import type { AnalysisResult } from '../types';
import { looksLikeUrl, normalizeMediaUrl, platformFromUrl } from '../utils/url';

export type AnalyzePhase = 'idle' | 'debouncing' | 'analyzing' | 'ready' | 'error';

const DEBOUNCE_MS = 600;
const CACHE_LIMIT = 12;

/**
 * Automatic URL analysis:
 *  - debounce (~600ms) while typing, no request per keystroke
 *  - instant analysis on paste / clipboard button
 *  - normalized-URL de-duplication (www/m prefixes, tracking params stripped)
 *  - AbortController cancels the in-flight request when the URL changes
 */
export function useAutoAnalyze() {
  const [value, setValueState] = useState('');
  const [phase, setPhase] = useState<AnalyzePhase>('idle');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef(new Map<string, AnalysisResult>());
  const lastKeyRef = useRef<string | null>(null);

  const run = useCallback((url: string) => {
    controllerRef.current?.abort();

    const key = normalizeMediaUrl(url);
    if (key && lastKeyRef.current === key && cacheRef.current.has(key)) {
      // Same media already analyzed — reuse the cached result, no new request.
      setAnalysis(cacheRef.current.get(key)!);
      setError(null);
      setPhase('ready');
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setPhase('analyzing');
    setError(null);
    setAnalysis(null);

    api
      .analyze(url, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (key) {
          cacheRef.current.set(key, result);
          if (cacheRef.current.size > CACHE_LIMIT) {
            const oldest = cacheRef.current.keys().next().value;
            if (oldest) cacheRef.current.delete(oldest);
          }
          lastKeyRef.current = key;
        }
        setAnalysis(result);
        setPhase('ready');
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setAnalysis(null);
        setPhase('error');
        setError(
          err instanceof ApiClientError
            ? err.message
            : 'We couldn’t process this URL. Please check the link and try again.',
        );
      });
  }, []);

  const setValue = useCallback(
    (next: string, opts?: { immediate?: boolean }) => {
      setValueState(next);
      if (timerRef.current) clearTimeout(timerRef.current);

      const trimmed = next.trim();
      if (!looksLikeUrl(trimmed)) {
        // Incomplete input: cancel anything pending, back to idle.
        controllerRef.current?.abort();
        setPhase('idle');
        setAnalysis(null);
        setError(null);
        return;
      }
      if (opts?.immediate) {
        run(trimmed);
        return;
      }
      setPhase('debouncing');
      timerRef.current = setTimeout(() => run(trimmed), DEBOUNCE_MS);
    },
    [run],
  );

  /** Enter key: analyze now (also the accessible fallback for the flow). */
  const submitNow = useCallback(() => {
    const trimmed = value.trim();
    if (looksLikeUrl(trimmed)) run(trimmed);
  }, [value, run]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    controllerRef.current?.abort();
    setValueState('');
    setPhase('idle');
    setAnalysis(null);
    setError(null);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      controllerRef.current?.abort();
    },
    [],
  );

  return {
    value,
    setValue,
    submitNow,
    reset,
    phase,
    analysis,
    error,
    platform: platformFromUrl(value),
  };
}
