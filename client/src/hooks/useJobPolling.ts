import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { JobStatus } from '../types';

const TERMINAL: JobStatus[] = ['completed', 'failed', 'cancelled', 'expired'];

/** Poll a download job until it reaches a terminal state — or the record
 * disappears (404), so stale history entries never poll forever. */
export function useJobPolling(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.jobStatus(jobId!),
    enabled: !!jobId,
    retry: 1,
    refetchInterval: (query) => {
      if (query.state.status === 'error') return false;
      const status = query.state.data?.status;
      return status && TERMINAL.includes(status) ? false : 1500;
    },
  });
}

export function isTerminal(status?: JobStatus): boolean {
  return !!status && TERMINAL.includes(status);
}
