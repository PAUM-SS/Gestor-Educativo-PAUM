import { useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';

interface UseApiErrorReturn {
  loading: boolean;
  execute: <T>(
    fn: () => Promise<T>,
    errorMessage?: string
  ) => Promise<T | null>;
}

export function useApiError(initialLoadingState = false): UseApiErrorReturn {
  const [loading, setLoading] = useState(initialLoadingState);
  const { showToast } = useToast();

  const execute = useCallback(
    async <T>(fn: () => Promise<T>, errorMessage = 'Ocurrió un error inesperado.'): Promise<T | null> => {
      setLoading(true);
      try {
        const result = await fn();
        return result;
      } catch (error) {
        console.error('[useApiError]', error);
        showToast(errorMessage, 'error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  return { loading, execute };
}
