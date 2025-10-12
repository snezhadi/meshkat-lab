'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Plus, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { ConfigurationManager } from './configuration-manager';
import { ParameterFilters } from './parameter-filters';
import { ParameterTable } from './parameter-table';

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
}

interface GlobalConfig {
  types: string[];
  priorities: number[];
  inputs: string[];
}

interface DocumentParametersEditorProps {
  parameters: Parameter[];
  config: ParameterConfig;
  templateId: string;
  onRefresh: () => void;
  onSave: (parameters: Parameter[]) => Promise<{ success: boolean; error?: string }>;
}

interface FilterState {
  search: string;
  group: string;
  subgroup: string;
  type: string;
  priority: string;
  hasCondition: string;
}

export function DocumentParametersEditor({
  parameters,
  config,
  templateId,
  onRefresh,
  onSave,
}: DocumentParametersEditorProps) {
  const router = useRouter();
  const { canExport } = usePermissions();
  const [filteredParameters, setFilteredParameters] = useState<Parameter[]>(parameters);
  const [activeTab, setActiveTab] = useState<'parameters' | 'configuration'>('parameters');
  const [filters, setFilters] = useState<FilterState>(() => {
    // Load filters from localStorage on component mount (template-specific)
    if (typeof window !== 'undefined') {
      const savedFilters = localStorage.getItem(`parameter-filters-template-${templateId}`);
      if (savedFilters) {
        try {
          return JSON.parse(savedFilters);
        } catch (error) {
          console.error('Error parsing saved filters:', error);
        }
      }
    }
    return {
      search: '',
      group: '',
      subgroup: '',
      type: '',
      priority: '',
      hasCondition: '',
    };
  });
  const [localConfig, setLocalConfig] = useState<ParameterConfig>(config);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({ types: [], priorities: [], inputs: [] });
  const [savingConfig, setSavingConfig] = useState(false);

  // Apply filters
  const applyFilters = useMemo(() => {
    return parameters.filter((param) => {
      // Search filter - only search in ID and name
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          param.id.toLowerCase().includes(searchLower) ||
          param.name.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;
      }

      // Group filter
      if (filters.group && param.display.group !== filters.group) {
        return false;
      }

      // Subgroup filter
      if (filters.subgroup && param.display.subgroup !== filters.subgroup) {
        return false;
      }

      // Type filter
      if (filters.type && param.type !== filters.type) {
        return false;
      }

      // Priority filter
      if (filters.priority) {
        const priority = param.metadata?.priority ?? 0;
        if (filters.priority === 'has' && priority === 0) return false;
        if (filters.priority === 'none' && priority > 0) return false;
        if (
          filters.priority !== 'has' &&
          filters.priority !== 'none' &&
          priority.toString() !== filters.priority
        ) {
          return false;
        }
      }

      // Condition filter
      if (filters.hasCondition === 'yes' && !param.condition) return false;
      if (filters.hasCondition === 'no' && param.condition) return false;

      return true;
    });
  }, [parameters, filters]);

  // Save filters to localStorage whenever they change (template-specific)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`parameter-filters-template-${templateId}`, JSON.stringify(filters));
    }
  }, [filters, templateId]);

  // Update filtered parameters when filters change
  React.useEffect(() => {
    setFilteredParameters(applyFilters);
  }, [applyFilters]);

  // Fetch global configuration
  useEffect(() => {
    const fetchGlobalConfig = async () => {
      try {
        const response = await fetch('/api/admin/global-configuration');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setGlobalConfig({
              types: result.parameterTypes?.map((t: any) => t.name) || [],
              priorities: result.priorityLevels?.map((p: any) => p.level) || [],
              inputs: result.inputTypes?.map((i: any) => i.name) || [],
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch global configuration:', error);
      }
    };

    fetchGlobalConfig();
  }, []);

  // Clear filters when navigating away from this page
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear filters when user navigates away or closes browser
      if (typeof window !== 'undefined') {
        localStorage.removeItem('parameter-filters');
      }
    };

    // Handle browser refresh/close
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Handle Next.js router navigation - clear filters when leaving this page
    const originalPush = router.push;
    router.push = (url: any, options?: any) => {
      // Clear filters before navigation
      if (typeof window !== 'undefined') {
        localStorage.removeItem('parameter-filters');
      }
      return originalPush.call(router, url, options);
    };

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Restore original router.push
      router.push = originalPush;
    };
  }, [router]);

  const handleCreateParameter = () => {
    // Navigate to create new parameter page with template ID
    router.push(`/admin/document-parameters/create?templateId=${templateId}`);
  };

  const handleReorderParameters = (reorderedParameters: Parameter[]) => {
    // Update the main parameters array with new order
    const newParameters = parameters.map((param) => {
      const reorderedParam = reorderedParameters.find((rp) => rp.id === param.id);
      return reorderedParam || param;
    });
    setFilteredParameters(reorderedParameters);
  };

  const handleParameterSave = async (updatedParameter: Parameter) => {
    try {
      // Update the parameter in the local state
      const updatedParameters = parameters.map(p => 
        p.id === updatedParameter.id ? updatedParameter : p
      );
      
      // Save via the onSave prop
      const result = await onSave(updatedParameters);
      
      if (result.success) {
        // Update local state
        setFilteredParameters(updatedParameters.map(p => 
          p.id === updatedParameter.id ? updatedParameter : p
        ));
      } else {
        throw new Error(result.error || 'Failed to save parameter');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error saving parameter:', errorMessage);
      throw err; // Re-throw so the caller can handle it
    }
  };

  const handleConfigChange = async (newConfig: ParameterConfig) => {
    try {
      setSavingConfig(true);

      if (!templateId) {
        throw new Error('Template ID not found');
      }

      // Save only the configuration (groups and subgroups)
      const response = await fetch('/api/admin/parameters/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: templateId,
          config: {
            groups: newConfig.groups,
            subgroups: newConfig.subgroups,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save configuration');
      }

      console.log('✅ Configuration saved successfully');
      // Update localConfig to reflect saved state
      setLocalConfig(newConfig);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error saving configuration:', errorMessage);
      // Optionally show a toast or alert to user
    } finally {
      setSavingConfig(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(parameters, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'parameters.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Contract Parameters</h1>
        <p className="text-gray-600">
          Manage employment contract parameters and their configurations
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('parameters')}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'parameters'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              📋 Parameters
            </button>
            <button
              onClick={() => setActiveTab('configuration')}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'configuration'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Settings className="mr-2 inline h-4 w-4" />
              Configuration
            </button>
          </nav>
        </div>
      </div>

      {/* Action Bar - Show for both tabs */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {activeTab === 'parameters' ? (
              <>
                <Button
                  onClick={handleCreateParameter}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Parameter
                </Button>

                <Button onClick={handleExport} variant="outline" disabled={!canExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </>
            ) : (
              <>{/* Configuration changes are now immediate - no save button needed */}</>
            )}
          </div>

          <div className="text-sm text-gray-500">
            {activeTab === 'parameters' ? (
              <>
                {filteredParameters.length} of {parameters.length} parameters
              </>
            ) : (
              <>Configuration settings • Changes saved automatically</>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'parameters' ? (
        <>
          {/* Filters */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <ParameterFilters filters={filters} onFiltersChange={setFilters} config={localConfig} globalConfig={globalConfig} />
          </div>

          {/* Parameters Table */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <ParameterTable
              parameters={filteredParameters}
              onReorder={handleReorderParameters}
              config={localConfig}
            />
          </div>
        </>
      ) : (
        /* Configuration Tab */
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <ConfigurationManager
            config={localConfig}
            parameters={parameters}
            onConfigChange={handleConfigChange}
            savingConfig={savingConfig}
          />
        </div>
      )}
    </div>
  );
}
