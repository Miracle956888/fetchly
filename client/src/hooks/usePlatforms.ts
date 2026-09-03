import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/** Platform list comes from the backend registry — never hardcoded. */
export function usePlatforms() {
  return useQuery({
    queryKey: ['platforms'],
    queryFn: api.platforms,
    staleTime: 5 * 60_000,
  });
}
