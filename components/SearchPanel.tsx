'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { useSearch } from '@/hooks/useSearch';
import { SearchSuggestion, SearchResult } from '@/lib/mapboxSearch';

interface SearchPanelProps {
  onLocationSelect: (result: SearchResult) => void;
  proximityCenter?: { lng: number; lat: number };
}

export function SearchPanel({
  onLocationSelect,
  proximityCenter,
}: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLDivElement>(null);

  const { suggestions, loading, error, suggest, retrieve, clearSuggestions } =
    useSearch({
      limit: 8,
      proximity: proximityCenter,
      debounceMs: 300,
    });

  // Handle search input changes
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setSelectedIndex(-1);

      if (value.trim()) {
        setIsOpen(true);
        suggest(value);
      } else {
        setIsOpen(false);
        clearSuggestions();
      }
    },
    [suggest, clearSuggestions]
  );

  // Handle search input clear
  const handleClear = useCallback(() => {
    setSearchQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    clearSuggestions();
  }, [clearSuggestions]);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback(
    async (suggestion: SearchSuggestion) => {
      try {
        const result = await retrieve(suggestion.mapboxId);
        if (result) {
          onLocationSelect(result);
          handleClear();
        } else {
          console.error('Failed to retrieve location: No result returned');
          setSearchQuery('');
          setIsOpen(false);
        }
      } catch (err) {
        console.error('Failed to retrieve location details:', err);
        setSearchQuery('');
        setIsOpen(false);
      }
    },
    [retrieve, onLocationSelect, handleClear]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || suggestions.length === 0) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            handleSelectSuggestion(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        default:
          break;
      }
    },
    [isOpen, suggestions, selectedIndex, handleSelectSuggestion]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="w-full max-w-md" ref={searchInputRef}>
      <Card className="p-4">
        <div className="space-y-2">
          <label
            htmlFor="location-search"
            className="text-sm font-medium text-gray-700"
          >
            Search Location
          </label>
          <div className="relative">
            <SearchInput
              value={searchQuery}
              onChange={handleSearchChange}
              onClear={handleClear}
              onKeyDown={handleKeyDown}
              isLoading={loading}
              placeholder="Search for cities, landmarks, addresses..."
            />
            <SearchResults
              suggestions={suggestions}
              onSelect={handleSelectSuggestion}
              isOpen={isOpen}
              isLoading={loading}
              error={error}
              selectedIndex={selectedIndex}
            />
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Tip: Type to search for locations, or click on the map to add
            waypoints directly.
          </p>
        </div>
      </Card>
    </div>
  );
}
