'use client';

import { useState, useCallback, useRef } from 'react';
import {
  getSuggestions,
  retrieveSearchResult,
  generateSessionToken,
  SearchSuggestion,
  SearchResult,
} from '@/lib/mapboxSearch';

interface UseSearchOptions {
  limit?: number;
  proximity?: { lng: number; lat: number };
  debounceMs?: number;
}

export function useSearch(options: UseSearchOptions = {}) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionTokenRef = useRef<string>(generateSessionToken());
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const debounceMs = options.debounceMs || 300;

  const suggest = useCallback(
    async (query: string) => {
      // Clear previous suggestions if query is empty
      if (!query.trim()) {
        setSuggestions([]);
        setError(null);
        return;
      }

      // Clear existing timeout
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timeout for debounced request
      debounceTimerRef.current = setTimeout(async () => {
        setLoading(true);
        setError(null);

        try {
          const results = await getSuggestions(query, sessionTokenRef.current, {
            limit: options.limit || 5,
            proximity: options.proximity,
          });
          setSuggestions(results);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Failed to fetch suggestions';
          setError(message);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, debounceMs);
    },
    [options.limit, options.proximity, debounceMs]
  );

  const retrieve = useCallback(
    async (mapboxId: string): Promise<SearchResult | null> => {
      try {
        const result = await retrieveSearchResult(
          mapboxId,
          sessionTokenRef.current
        );
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to retrieve result';
        setError(message);
        return null;
      }
    },
    []
  );

  const resetSession = useCallback(() => {
    sessionTokenRef.current = generateSessionToken();
    setSuggestions([]);
    setError(null);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    loading,
    error,
    suggest,
    retrieve,
    resetSession,
    clearSuggestions,
    sessionToken: sessionTokenRef.current,
  };
}
