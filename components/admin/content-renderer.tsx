'use client';

import React from 'react';
import MDEditor from '@uiw/react-md-editor';

interface ContentRendererProps {
  content: string;
  className?: string;
}

export function ContentRenderer({ content, className = '' }: ContentRendererProps) {
  if (!content) return null;

  // Pre-process content to style parameters before passing to MDEditor
  const processContent = (content: string) => {
    // Replace @parameter with styled spans
    return content.replace(/(@[a-zA-Z_][a-zA-Z0-9_]*)/g, (match) => {
      return `<span class="parameter-placeholder">${match}</span>`;
    });
  };

  return (
    <div className={`content-renderer ${className}`} data-color-mode="light">
      <MDEditor.Markdown
        source={processContent(content)}
        style={{
          backgroundColor: 'transparent',
          color: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit',
        }}
      />
      <style jsx global>{`
        .content-renderer .w-md-editor-text-container,
        .content-renderer .w-md-editor-text {
          background: transparent !important;
          color: inherit !important;
        }
        .content-renderer .w-md-editor-text pre,
        .content-renderer .w-md-editor-text code {
          background: transparent !important;
          color: inherit !important;
        }
        /* Style parameter placeholders */
        .content-renderer .parameter-placeholder {
          background-color: #f3f4f6 !important;
          color: #374151 !important;
          padding: 2px 4px !important;
          border-radius: 3px !important;
          font-family: monospace !important;
          font-size: 0.875em !important;
          font-weight: 500 !important;
        }
        /* Ensure proper spacing */
        .content-renderer .w-md-editor-text {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        /* Fix list rendering */
        .content-renderer ul {
          list-style-type: disc !important;
          margin-left: 1.5em !important;
          padding-left: 0 !important;
        }
        .content-renderer ol {
          list-style-type: decimal !important;
          margin-left: 1.5em !important;
          padding-left: 0 !important;
        }
        .content-renderer li {
          display: list-item !important;
          margin-bottom: 0.25em !important;
        }
        .content-renderer ul li::marker,
        .content-renderer ol li::marker {
          color: inherit !important;
        }
      `}</style>
    </div>
  );
}
