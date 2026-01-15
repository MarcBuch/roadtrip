'use client';

import { SearchSuggestion } from '@/lib/mapboxSearch';
import { AlertCircle, MapPin } from 'lucide-react';

interface SearchResultsProps {
  suggestions: SearchSuggestion[];
  onSelect: (suggestion: SearchSuggestion) => void;
  isOpen: boolean;
  isLoading?: boolean;
  error?: string | null;
  selectedIndex?: number;
}

export function SearchResults({
  suggestions,
  onSelect,
  isOpen,
  isLoading,
  error,
  selectedIndex,
}: SearchResultsProps) {
  if (!isOpen) {
    return null;
  }

  if (error) {
    return (
      <div
        className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex gap-3 items-start"
        onMouseDown={(e) => e.preventDefault()}
      >
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-900">Search Error</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center"
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100" />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200" />
        </div>
        <p className="text-sm text-gray-600 mt-2">Searching...</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div
        className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center"
        onMouseDown={(e) => e.preventDefault()}
      >
        <p className="text-sm text-gray-500">No results found</p>
      </div>
    );
  }

  return (
    <div
      className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50"
      role="listbox"
      onMouseDown={(e) => {
        e.preventDefault();
        // Find which suggestion was clicked
        const target = e.target as HTMLElement;
        const resultDiv = target.closest('[data-suggestion-id]');
        if (resultDiv) {
          const suggestionId = resultDiv.getAttribute('data-suggestion-id');
          const suggestion = suggestions.find(
            (s) => s.mapboxId === suggestionId
          );
          if (suggestion) {
            onSelect(suggestion);
          }
        }
      }}
    >
      <ul className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
        {suggestions.map((suggestion, index) => (
          <li
            key={suggestion.mapboxId}
            role="presentation"
            data-suggestion-id={suggestion.mapboxId}
            className={`px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer ${
              index === selectedIndex
                ? 'bg-blue-50 border-l-2 border-blue-500'
                : 'hover:bg-gray-50 border-l-2 border-transparent'
            }`}
          >
            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {suggestion.name}
              </div>
              <div className="text-sm text-gray-500 truncate">
                {suggestion.placeFormatted}
              </div>
              {suggestion.featureType && (
                <div className="text-xs text-gray-400 mt-1">
                  {suggestion.featureType.charAt(0).toUpperCase() +
                    suggestion.featureType.slice(1)}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
