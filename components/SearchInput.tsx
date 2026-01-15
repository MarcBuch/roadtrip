'use client';

import { Input } from '@/components/ui/input';
import { Loader2, Search, X } from 'lucide-react';
import { ChangeEvent, useCallback, KeyboardEvent } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  onClear,
  onKeyDown,
  isLoading,
  placeholder = 'Search for a location...',
}: SearchInputProps) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onClear();
  }, [onClear]);

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 h-4 w-4 text-gray-400 animate-spin" />
        ) : value ? (
          <button
            onClick={handleClear}
            className="absolute right-3 h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
