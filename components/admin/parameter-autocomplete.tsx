'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface ParameterAutocompleteProps {
  parameters: string[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelect: (parameter: string) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export function ParameterAutocomplete({
  parameters,
  searchTerm,
  onSearchChange,
  onSelect,
  onClose,
  position
}: ParameterAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < parameters.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : parameters.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (parameters[selectedIndex]) {
          onSelect(parameters[selectedIndex]);
        }
      } else if (e.key === '@') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [parameters, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  if (parameters.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-64"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="p-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Parameters</span>
          <span className="text-xs text-gray-500">
            {parameters.length} result{parameters.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      <div ref={listRef} className="max-h-48 overflow-y-auto">
        {parameters.map((parameter, index) => (
          <button
            key={parameter}
            type="button"
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
              index === selectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
            }`}
            onClick={() => onSelect(parameter)}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono">{parameter}</span>
              <span className="text-xs text-gray-500 ml-2">@</span>
            </div>
          </button>
        ))}
      </div>
      
      <div className="p-2 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span>↑↓ to navigate</span>
            <span>Enter to select</span>
            <span>Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
