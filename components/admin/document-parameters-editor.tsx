"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ParameterTable } from './parameter-table';
import { ParameterFilters } from './parameter-filters';
import { ConfigurationManager } from './configuration-manager';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus, Download, Settings } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

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

interface DocumentParametersEditorProps {
  parameters: Parameter[];
  config: ParameterConfig;
  onRefresh: () => void;
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
  onRefresh
}: DocumentParametersEditorProps) {
  const router = useRouter();
  const { canExport } = usePermissions();
  const [filteredParameters, setFilteredParameters] = useState<Parameter[]>(parameters);
  const [activeTab, setActiveTab] = useState<'parameters' | 'configuration'>('parameters');
  const [filters, setFilters] = useState<FilterState>(() => {
    // Load filters from localStorage on component mount
    if (typeof window !== 'undefined') {
      const savedFilters = localStorage.getItem('parameter-filters');
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
      hasCondition: ''
    };
  });
  const [localConfig, setLocalConfig] = useState<ParameterConfig>(config);
  const [savingConfig, setSavingConfig] = useState(false);

  // Apply filters
  const applyFilters = useMemo(() => {
    return parameters.filter(param => {
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
        if (filters.priority !== 'has' && filters.priority !== 'none' && priority.toString() !== filters.priority) {
          return false;
        }
      }

      // Condition filter
      if (filters.hasCondition === 'yes' && !param.condition) return false;
      if (filters.hasCondition === 'no' && param.condition) return false;

      return true;
    });
  }, [parameters, filters]);

  // Save filters to localStorage whenever they change
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('parameter-filters', JSON.stringify(filters));
    }
  }, [filters]);

  // Update filtered parameters when filters change
  React.useEffect(() => {
    setFilteredParameters(applyFilters);
  }, [applyFilters]);

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
    // Navigate to create new parameter page
    router.push('/admin/document-parameters/create');
  };



  const handleReorderParameters = (reorderedParameters: Parameter[]) => {
    // Update the main parameters array with new order
    const newParameters = parameters.map(param => {
      const reorderedParam = reorderedParameters.find(rp => rp.id === param.id);
      return reorderedParam || param;
    });
    setFilteredParameters(reorderedParameters);
  };


  const handleConfigChange = async (newConfig: ParameterConfig) => {
    try {
      setSavingConfig(true);
      
      const response = await fetch('/api/admin/parameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parameters: parameters,
          config: newConfig
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      const result = await response.json();
      console.log('Configuration save result:', result);
      
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contract Parameters</h1>
        <p className="text-gray-600">Manage employment contract parameters and their configurations</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('parameters')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'parameters'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Parameters
            </button>
            <button
              onClick={() => setActiveTab('configuration')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'configuration'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Configuration
            </button>
          </nav>
        </div>
      </div>

      {/* Action Bar - Show for both tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {activeTab === 'parameters' ? (
              <>
                <Button 
                  onClick={handleCreateParameter}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Parameter
                </Button>
                
                <Button 
                  onClick={handleExport}
                  variant="outline"
                  disabled={!canExport}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </>
            ) : (
              <>
                {/* Configuration changes are now immediate - no save button needed */}
              </>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            {activeTab === 'parameters' ? (
              <>
                {filteredParameters.length} of {parameters.length} parameters
              </>
            ) : (
              <>
                Configuration settings • Changes saved automatically
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'parameters' ? (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <ParameterFilters
              filters={filters}
              onFiltersChange={setFilters}
              config={localConfig}
            />
          </div>

          {/* Parameters Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <ParameterTable 
                parameters={filteredParameters}
                onReorder={handleReorderParameters}
                config={localConfig}
              />
          </div>
        </>
      ) : (
        /* Configuration Tab */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
