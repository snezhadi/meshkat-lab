'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Code, Eye, FileText } from 'lucide-react';

interface HtmlEditorProps {
  content: string;
  onChange: (content: string) => void;
  availableParameters?: string[];
  placeholder?: string;
  enableParameters?: boolean; // New prop to control parameter functionality
}

export function HtmlEditor({ 
  content, 
  onChange, 
  availableParameters, 
  placeholder = "Start typing...",
  enableParameters = false 
}: HtmlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  useEffect(() => {
    if (editorRef.current && !isCodeMode) {
      if (editorRef.current.innerHTML !== content) {
        editorRef.current.innerHTML = content;
      }
    }
  }, [content, isCodeMode]);

  const formatText = (command: string, value?: string) => {
    if (isCodeMode) return;
    
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateToolbarState();
    handleInput();
  };

  const updateToolbarState = () => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
  };

  const handleInput = () => {
    if (isCodeMode) return;
    
    const newContent = editorRef.current?.innerHTML || '';
    onChange(newContent);
    updateToolbarState();
  };

  const handleCodeModeToggle = () => {
    if (isCodeMode) {
      // Switching from code to visual mode
      const textarea = editorRef.current?.querySelector('textarea');
      if (textarea) {
        onChange(textarea.value);
      }
    } else {
      // Switching from visual to code mode
      const currentContent = editorRef.current?.innerHTML || '';
      onChange(currentContent);
    }
    setIsCodeMode(!isCodeMode);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isCodeMode) return;
    
    updateToolbarState();
    
    if (enableParameters) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textBeforeCaret = range.startContainer.textContent?.substring(0, range.startOffset);
        const atIndex = textBeforeCaret?.lastIndexOf('@');

        if (atIndex !== undefined && atIndex !== -1) {
          const query = textBeforeCaret?.substring(atIndex + 1);
          if (query !== undefined) {
            setSearchTerm(query);
            const rect = range.getBoundingClientRect();
            const editorRect = editorRef.current?.getBoundingClientRect();
            
            if (editorRect) {
              setAutocompletePosition({
                top: rect.bottom - editorRect.top + window.scrollY,
                left: rect.left - editorRect.left + window.scrollX
              });
              setShowAutocomplete(true);
            }
          }
        } else {
          setShowAutocomplete(false);
        }
      }
    }
  };

  const handleParameterSelect = (parameter: string) => {
    if (!enableParameters) return;
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textBeforeCaret = range.startContainer.textContent?.substring(0, range.startOffset);
      const atIndex = textBeforeCaret?.lastIndexOf('@');

      if (atIndex !== undefined && atIndex !== -1) {
        // Delete the @ and the search term
        range.setStart(range.startContainer, atIndex);
        range.deleteContents();
      }
      
      // Create a span element for the parameter placeholder
      const span = document.createElement('span');
      span.className = 'bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-sm font-mono';
      span.textContent = `@${parameter}`;
      span.contentEditable = 'false'; // Make it non-editable as a single unit
      
      range.insertNode(span);
      
      // Move cursor after the parameter
      range.setStartAfter(span);
      range.setEndAfter(span);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    setShowAutocomplete(false);
    handleInput();
  };

  const filteredParameters = (availableParameters || []).filter(param =>
    param.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative border border-gray-200 rounded-md">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50 rounded-t-md">
        <div className="flex items-center space-x-1">
          {!isCodeMode && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => formatText('bold')}
                className={`h-8 w-8 p-0 ${isBold ? 'bg-gray-200' : ''}`}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => formatText('italic')}
                className={`h-8 w-8 p-0 ${isItalic ? 'bg-gray-200' : ''}`}
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => formatText('insertUnorderedList')}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => formatText('insertOrderedList')}
                className="h-8 w-8 p-0"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
              <div className="h-4 w-px bg-gray-300 mx-1" />
            </>
          )}
          {enableParameters && (
            <span className="text-xs text-gray-600">Type @ to insert parameters</span>
          )}
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCodeModeToggle}
          className="h-8 w-8 p-0"
        >
          {isCodeMode ? <Eye className="h-4 w-4" /> : <Code className="h-4 w-4" />}
        </Button>
      </div>

      {/* Editor */}
      {isCodeMode ? (
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-[300px] p-4 font-mono text-sm border-0 focus:outline-none resize-none"
          placeholder={placeholder}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          className="min-h-[300px] p-4 focus:outline-none prose max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          style={{ 
            minHeight: '300px',
            outline: 'none'
          }}
          suppressContentEditableWarning
        />
      )}

      {!content && !isCodeMode && (
        <div className="absolute top-[60px] left-4 text-gray-400 pointer-events-none">
          {placeholder}
        </div>
      )}

      {/* Parameter Autocomplete */}
      {showAutocomplete && enableParameters && filteredParameters.length > 0 && (
        <div
          className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
          style={{
            top: autocompletePosition.top + 20,
            left: autocompletePosition.left,
            minWidth: '200px'
          }}
        >
          {filteredParameters.slice(0, 10).map((parameter, index) => (
            <button
              key={parameter}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
              onClick={() => handleParameterSelect(parameter)}
            >
              @{parameter}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
