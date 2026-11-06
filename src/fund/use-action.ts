import { useCallback, useState } from 'react';

import { errorMessage } from '@/api/errors';
import type { FundPayload } from '@/api/types';

import { useFund } from './context';

/**
 * Runs a mutation that answers `{ payload }` (every fund mutation does), swaps the fresh fund
 * into the cache and tracks busy/error state for the form that triggered it.
 */
export function useAction() {
  const { commit } = useFund();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (request: () => Promise<{ payload: FundPayload }>): Promise<FundPayload | null> => {
      setBusy(true);
      setError(null);
      try {
        const res = await request();
        commit(res.payload);
        return res.payload;
      } catch (e) {
        setError(errorMessage(e));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [commit],
  );

  return { run, busy, error, clearError: () => setError(null) };
}
