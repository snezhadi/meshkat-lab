'use client';

import React, { useEffect, useState } from 'react';
import { DocumentParametersEditor } from '@/components/admin/document-parameters-editor';

interface Parameter {
  id: string;
  name: string;
  description?: string;
  type: string;
  metadata?: {
    llm_instructions?: string;
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

export default function ContractParametersPage() {
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [config, setConfig] = useState<ParameterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load parameters and config
  useEffect(() => {
    loadParameters();
  }, []);

  const loadParameters = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/parameters');
      if (!response.ok) {
        throw new Error('Failed to load parameters');
      }

      const data = await response.json();
      setParameters(data.parameters);
      setConfig(data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
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
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Error Loading Parameters</h2>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={loadParameters}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-6xl text-yellow-600">⚠️</div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Configuration Missing</h2>
          <p className="text-gray-600">Parameter configuration could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DocumentParametersEditor
        parameters={parameters}
        config={config}
        onRefresh={loadParameters}
      />
    </div>
  );
}
