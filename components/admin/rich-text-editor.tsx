'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Code, Eye } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  availableParameters?: string[];
  placeholder?: string;
  enableParameters?: boolean;
}

export function RichTextEditor({ 
  content, 
  onChange, 
  availableParameters = [], 
  placeholder = "Start typing...",
  enableParameters = false 
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [showParameterDropdown, setShowParameterDropdown] = useState(false);
  const [parameterSearch, setParameterSearch] = useState('');
  const [isModeSwitching, setIsModeSwitching] = useState(false);

  // Initialize content when component mounts
  useEffect(() => {
    if (editorRef.current && !isCodeMode) {
      if (!editorRef.current.innerHTML && content) {
        editorRef.current.innerHTML = content;
      } else if (!editorRef.current.innerHTML && !content) {
        // Initialize empty editor with nothing
        editorRef.current.innerHTML = '';
      }
    }
  }, []);

  // Update content only when switching modes or when content is significantly different
  useEffect(() => {
    if (editorRef.current && !isCodeMode && !isModeSwitching) {
      const currentContent = editorRef.current.innerHTML;
      // Only update if the content is significantly different and we're not in the middle of editing
      if (content && content.trim() && currentContent !== content && Math.abs(currentContent.length - content.length) > 50) {
        editorRef.current.innerHTML = content;
      } else if ((!content || content.trim() === '') && (currentContent.trim() === '' || currentContent === '<p><br></p>')) {
        // Only clear if content is truly empty
        editorRef.current.innerHTML = '';
      }
    }
  }, [content, isCodeMode, isModeSwitching]);

  const formatText = (command: string, value?: string) => {
    if (isCodeMode) return;
    
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateToolbarState();
    handleInput();
  };

  const updateToolbarState = useCallback(() => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
  }, []);

  // Normalize content to use proper paragraph tags
  const normalizeContent = (html: string) => {
    // If content is empty, return empty string
    if (!html.trim()) {
      return '';
    }
    
    // Replace div tags with p tags for better semantics
    let normalized = html
      .replace(/<div([^>]*)>/gi, '<p$1>')
      .replace(/<\/div>/gi, '</p>')
      .replace(/<p><br><\/p>/gi, '<p><br></p>') // Handle empty paragraphs with br
      .replace(/<p><\/p>/gi, '<p><br></p>') // Handle completely empty paragraphs
      .replace(/<p>\s*<\/p>/gi, '<p><br></p>'); // Handle paragraphs with only whitespace
    
    // If content is just empty paragraphs or whitespace, return empty string
    if (normalized.replace(/<p><br><\/p>/gi, '').trim() === '') {
      return '';
    }
    
    // If content doesn't start with a tag, wrap it in p tags
    if (normalized.trim() && !normalized.match(/^<[^>]+>/)) {
      normalized = `<p>${normalized}</p>`;
    }
    
    return normalized;
  };

  const handleInput = () => {
    if (isCodeMode) return;
    
    let newContent = editorRef.current?.innerHTML || '';
    
    // Normalize the content to use proper paragraph tags
    newContent = normalizeContent(newContent);
    
    onChange(newContent);
    updateToolbarState();
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isCodeMode) return;
    
    // Handle Enter key to create proper paragraphs
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Create a new paragraph
        const p = document.createElement('p');
        p.innerHTML = '<br>'; // Add line break for empty paragraph
        
        // Insert the paragraph
        range.insertNode(p);
        
        // Move cursor to the new paragraph
        range.setStart(p, 0);
        range.setEnd(p, 0);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Update content
        handleInput();
        return;
      }
    }
    
    updateToolbarState();
  };

  // Insert parameter at cursor position
  const insertParameter = (parameter: string) => {
    if (!editorRef.current || isCodeMode) return;

    // First, ensure the editor has focus
    editorRef.current.focus();

    const selection = window.getSelection();
    let range: Range;
    
    // If no selection or range, create one at the end of the content
    if (!selection || selection.rangeCount === 0) {
      range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false); // Move to end
    } else {
      range = selection.getRangeAt(0);
      
      // Check if the range is still within our editor
      if (!editorRef.current.contains(range.commonAncestorContainer)) {
        // If cursor is outside editor, move to end
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false); // Move to end
      }
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
    
    // Clear selection and set the new range
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // Update content
    handleInput();
    
    // Close dropdown
    setShowParameterDropdown(false);
    setParameterSearch('');
  };

  const handleCodeModeToggle = () => {
    setIsModeSwitching(true);
    
    if (isCodeMode) {
      // Switching from code to visual mode
      const textarea = editorRef.current?.querySelector('textarea');
      if (textarea && editorRef.current) {
        // Get the HTML content from textarea and set it to the contentEditable div
        const htmlContent = textarea.value;
        editorRef.current.innerHTML = htmlContent;
        // Don't call onChange here to avoid triggering useEffect
      }
    } else {
      // Switching from visual to code mode
      const currentContent = editorRef.current?.innerHTML || '';
      onChange(currentContent);
    }
    
    setIsCodeMode(!isCodeMode);
    
    // Reset mode switching flag after a short delay
    setTimeout(() => {
      setIsModeSwitching(false);
    }, 200);
  };


  // Close parameter dropdown when clicking outside
  const handleClickOutside = (e: React.MouseEvent) => {
    if (showParameterDropdown) {
      const target = e.target as HTMLElement;
      if (!target.closest('.parameter-dropdown')) {
        setShowParameterDropdown(false);
        setParameterSearch('');
      }
    }
  };

  const filteredParameters = (availableParameters || []).filter(param =>
    param.toLowerCase().includes(parameterSearch.toLowerCase())
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
                    <div className="relative parameter-dropdown">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          // Store current cursor position before opening dropdown
                          if (editorRef.current) {
                            editorRef.current.focus();
                          }
                          setShowParameterDropdown(!showParameterDropdown);
                        }}
                        className="h-8 text-xs"
                      >
                        <span className="mr-1">@</span>
                        Add Parameter
                      </Button>
                      
                      {showParameterDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
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
                    </div>
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
                />
              ) : (
        <div
          ref={editorRef}
          contentEditable
          className="min-h-[300px] p-4 focus:outline-none prose max-w-none rounded-b-md"
                  onInput={handleInput}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => {
                    handleClickOutside(e);
                    // Ensure editor has focus when clicked
                    if (editorRef.current) {
                      editorRef.current.focus();
                    }
                  }}
                  onFocus={() => {
                    // Ensure content is preserved when editor gains focus
                    if (editorRef.current && !isModeSwitching) {
                      const currentContent = editorRef.current.innerHTML;
                      if (currentContent !== content && content && content.trim()) {
                        editorRef.current.innerHTML = content;
                      }
                    }
                  }}
          style={{ 
            minHeight: '300px',
            outline: 'none'
          }}
          suppressContentEditableWarning
        />
      )}



              {/* CSS for proper list rendering and paragraph handling */}
              <style jsx global>{`
                .prose ul {
                  list-style-type: disc;
                  margin-left: 1.5rem;
                  margin-bottom: 1rem;
                }
                .prose ol {
                  list-style-type: decimal;
                  margin-left: 1.5rem;
                  margin-bottom: 1rem;
                }
                .prose li {
                  margin-bottom: 0.25rem;
                  display: list-item;
                }
                .prose p {
                  margin-bottom: 1rem;
                  margin-top: 1rem;
                  line-height: 1.6;
                }
                .prose p:first-child {
                  margin-top: 0;
                }
                .prose p:last-child {
                  margin-bottom: 0;
                }
                .prose div {
                  margin-bottom: 1rem;
                }
                /* br tags should have minimal spacing */
                .prose br {
                  line-height: 1;
                }
                .prose strong {
                  font-weight: bold;
                }
                .prose em {
                  font-style: italic;
                }
                .bg-gray-200.text-gray-800 {
                  background-color: #e5e7eb;
                  color: #374151;
                  padding: 2px 4px;
                  border-radius: 4px;
                  font-family: monospace;
                  font-size: 12px;
                }
                /* Force contentEditable to use p tags instead of div */
                [contenteditable] div {
                  display: block;
                  margin: 1rem 0;
                }
              `}</style>
    </div>
  );
}
