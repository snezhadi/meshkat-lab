'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DocumentParametersEditor } from '@/components/admin/document-parameters-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Parameter {
  id: string; // custom_id for frontend compatibility
  dbId: number; // database primary key for API operations
  name: string;
  description?: string;
  type: string;
  metadata?: {
    llm_instructions?: string;
    llm_description?: string;
    priority?: number;
    format?: string;
  };
  condition?: string;
  display: {
    group: string;
    subgroup: string;
    label: string;
    input: string;
  };
  options?: string[];
}

interface ParameterConfig {
  groups: string[];
  subgroups: Record<string, string[]>;
  types: string[];
  priorities: number[];
  inputs: string[];
}

interface Template {
  id: number;
  title: string;
}

export default function ContractParametersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [config, setConfig] = useState<ParameterConfig | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    // Load selected template from localStorage, fallback to URL param, then empty
    if (typeof window !== 'undefined') {
      const savedTemplateId = localStorage.getItem('selected-template-id');
      if (savedTemplateId) {
        return savedTemplateId;
      }
    }
    return searchParams.get('templateId') || '';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load templates and parameters
  useEffect(() => {
    loadTemplates();
  }, []);

  // Save selected template to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedTemplateId) {
      localStorage.setItem('selected-template-id', selectedTemplateId);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    if (selectedTemplateId) {
      loadParameters();
    }
  }, [selectedTemplateId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/document-templates');
      if (!response.ok) {
        throw new Error('Failed to load templates');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const templateList = data.data.map((template: any) => ({
          id: template.id,
          title: template.title,
        }));
        setTemplates(templateList);
        
        // Auto-select first template if available and no template in URL
        if (templateList.length > 0 && !selectedTemplateId) {
          const firstTemplateId = templateList[0].id.toString();
          setSelectedTemplateId(firstTemplateId);
          // Template selection is now persisted in localStorage
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadParameters = async () => {
    if (!selectedTemplateId) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/parameters?templateId=${selectedTemplateId}`);
      if (!response.ok) {
        throw new Error('Failed to load parameters');
      }

      const data = await response.json();
      setParameters(data.parameters || []);
      setConfig(data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveParameters = async (updatedParameters: Parameter[]) => {
    if (!selectedTemplateId) return;

    try {
      const response = await fetch('/api/admin/parameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parameters: updatedParameters,
          templateId: selectedTemplateId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save parameters');
      }

      const result = await response.json();
      if (result.success) {
        setParameters(updatedParameters);
        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to save parameters');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error saving parameters:', errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-32 w-32 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading parameters...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-6xl text-red-600">⚠️</div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Error Loading Data</h2>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={loadTemplates}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="space-y-6 p-6">
        {/* Template Selector */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="template-select" className="text-sm font-medium text-gray-700">
              Select Template:
            </Label>
            <Select 
              value={selectedTemplateId} 
              onValueChange={(value) => {
                setSelectedTemplateId(value);
                // Template selection is now persisted in localStorage
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Parameters Editor */}
        {selectedTemplateId && config ? (
          <DocumentParametersEditor
            parameters={parameters}
            config={config}
            templateId={selectedTemplateId}
            onRefresh={loadParameters}
            onSave={handleSaveParameters}
          />
        ) : selectedTemplateId && !config ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-lg border">
            <div className="text-center">
              <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
              <p className="mt-2 text-gray-600">Loading parameters...</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
