'use client';

import { useEffect, useState } from 'react';
import { Condition } from '@/components/admin/condition-builder';
import { DocumentTemplatesEditor } from '@/components/admin/document-templates-editor';

interface DocumentTemplate {
  id: string;
  title: string;
  version: string;
  description: string;
  introduction: {
    id: string;
    title: string;
    content: string;
  };
  clauses: Array<{
    id: string;
    title: string;
    content: string;
    description: string | null;
    condition?: Condition | string;
    paragraphs: Array<{
      id: string;
      title: string;
      content: string;
      description: string | null;
      condition?: Condition | string;
    }>;
  }>;
}

export default function DocumentTemplatesPage() {
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocumentTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/document-templates');

      if (!response.ok) {
        throw new Error('Failed to load document templates');
      }

      const result = await response.json();

      if (result.success) {
        setDocumentTemplates(result.data);
      } else {
        throw new Error(result.error || 'Failed to load document templates');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error loading document templates:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (
    updatedTemplates: DocumentTemplate[],
    createCheckpoint: boolean = false
  ) => {
    try {
      const response = await fetch('/api/admin/document-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentTemplates: updatedTemplates,
          createCheckpoint,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save document templates');
      }

      const result = await response.json();

      if (result.success) {
        setDocumentTemplates(updatedTemplates);
        return { success: true, checkpoint: result.checkpoint };
      } else {
        throw new Error(result.error || 'Failed to save document templates');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error saving document templates:', errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  useEffect(() => {
    loadDocumentTemplates();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Document Templates</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
            <p className="mt-2 text-gray-600">Loading document templates...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Document Templates</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="text-lg text-red-600">⚠️</div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Document Templates</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={loadDocumentTemplates}
                  className="rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DocumentTemplatesEditor documentTemplates={documentTemplates} onSave={handleSave} />
    </div>
  );
}
