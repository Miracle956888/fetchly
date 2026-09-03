import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { TrackedDownload } from '../types';

/**
 * Session download manager. Tracks jobs the user started in this browser so
 * they survive navigation and reloads (localStorage). Nothing personal is
 * stored server-side for anonymous users.
 */
interface DownloadsContextValue {
  downloads: TrackedDownload[];
  addDownload: (d: TrackedDownload) => void;
  removeDownload: (jobId: string) => void;
  clearFinished: (finishedIds: string[]) => void;
}

const DownloadsContext = createContext<DownloadsContextValue | null>(null);
const STORAGE_KEY = 'fetchly.downloads.v1';

function load(): TrackedDownload[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrackedDownload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function DownloadsProvider({ children }: { children: ReactNode }) {
  const [downloads, setDownloads] = useState<TrackedDownload[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(downloads.slice(0, 50)));
    } catch {
      /* storage full/blocked — non-fatal */
    }
  }, [downloads]);

  const addDownload = useCallback((d: TrackedDownload) => {
    setDownloads((prev) => [d, ...prev.filter((x) => x.jobId !== d.jobId)].slice(0, 50));
  }, []);

  const removeDownload = useCallback((jobId: string) => {
    setDownloads((prev) => prev.filter((x) => x.jobId !== jobId));
  }, []);

  const clearFinished = useCallback((finishedIds: string[]) => {
    const set = new Set(finishedIds);
    setDownloads((prev) => prev.filter((x) => !set.has(x.jobId)));
  }, []);

  const value = useMemo(
    () => ({ downloads, addDownload, removeDownload, clearFinished }),
    [downloads, addDownload, removeDownload, clearFinished],
  );

  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDownloads(): DownloadsContextValue {
  const ctx = useContext(DownloadsContext);
  if (!ctx) throw new Error('useDownloads must be used within DownloadsProvider');
  return ctx;
}
