'use client';

import React, { useState, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Button } from '@/components/ui/button';
import { AtSign, Eye, Edit } from 'lucide-react';
import { ContentRenderer } from './content-renderer';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  availableParameters?: string[];
  placeholder?: string;
  enableParameters?: boolean;
}

export function MarkdownEditor({ 
  content, 
  onChange, 
  availableParameters = [], 
  placeholder = "Start typing...",
  enableParameters = false 
}: MarkdownEditorProps) {
  const [showParameterDropdown, setShowParameterDropdown] = useState(false);
  const [parameterSearch, setParameterSearch] = useState('');
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'live'>('edit');

  // Insert parameter at cursor position
  const insertParameter = useCallback((parameter: string) => {
    const parameterText = `@${parameter}`;
    
    // Insert at the end of content for now
    // TODO: In a full implementation, we'd need to get cursor position from MDEditor
    const newContent = content + (content ? ' ' : '') + parameterText;
    onChange(newContent);
    
    // Close dropdown
    setShowParameterDropdown(false);
    setParameterSearch('');
  }, [content, onChange]);

  // Filter parameters based on search
  const filteredParameters = availableParameters.filter(param =>
    param.toLowerCase().includes(parameterSearch.toLowerCase())
  );

  // Custom command for adding parameters
  const addParameterCommand = {
    name: 'addParameter',
    keyCommand: 'addParameter',
    buttonProps: { 
      'aria-label': 'Add Parameter',
      title: 'Add Parameter'
    },
    icon: <AtSign className="h-4 w-4" />,
    execute: () => {
      setShowParameterDropdown(!showParameterDropdown);
    },
  };

  return (
    <div className="relative border border-gray-200 rounded-md">
      {/* Custom Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50 rounded-t-md">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Markdown Editor</span>
          {enableParameters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowParameterDropdown(!showParameterDropdown)}
              className="h-8 text-xs"
            >
              <AtSign className="h-4 w-4 mr-1" />
              Add Parameter
            </Button>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            type="button"
            variant={previewMode === 'edit' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode('edit')}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={previewMode === 'preview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode('preview')}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Custom Parameter Dropdown */}
      {showParameterDropdown && enableParameters && (
        <div className="absolute top-12 left-2 z-50 w-80 bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search parameters..."
              value={parameterSearch}
              onChange={(e) => setParameterSearch(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto border-t border-gray-200">
            {filteredParameters.slice(0, 20).map((parameter) => (
              <button
                key={parameter}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
                onClick={() => insertParameter(parameter)}
              >
                @{parameter}
              </button>
            ))}
            {filteredParameters.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">
                No parameters found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Markdown Editor */}
      <div data-color-mode="light">
        {previewMode === 'preview' ? (
          <div className="p-4 border border-gray-200 rounded-b-md" style={{ minHeight: '300px' }}>
            <ContentRenderer content={content} />
          </div>
        ) : (
          <MDEditor
            value={content}
            onChange={(val) => onChange(val || '')}
            preview={previewMode}
            hideToolbar={true}
            height={300}
            textareaProps={{
              placeholder: placeholder,
            }}
          />
        )}
      </div>

      {/* Click outside to close dropdown */}
      {showParameterDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowParameterDropdown(false);
            setParameterSearch('');
          }}
        />
      )}
    </div>
  );
}
