'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'next/navigation';

interface ParameterType {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
}

interface InputType {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
}

interface PriorityLevel {
  id: number;
  level: number;
  name: string;
  sort_order: number;
  created_at: string;
}

export default function GlobalConfigurationPage() {
  const [parameterTypes, setParameterTypes] = useState<ParameterType[]>([]);
  const [inputTypes, setInputTypes] = useState<InputType[]>([]);
  const [priorityLevels, setPriorityLevels] = useState<PriorityLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { canManageGlobalConfig } = usePermissions();
  const router = useRouter();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/global-configuration');
      if (!response.ok) {
        throw new Error('Failed to load global configuration');
      }

      const data = await response.json();
      setParameterTypes(data.parameterTypes || []);
      setInputTypes(data.inputTypes || []);
      setPriorityLevels(data.priorityLevels || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveData = async () => {
    try {
      const response = await fetch('/api/admin/global-configuration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parameterTypes,
          inputTypes,
          priorityLevels,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save global configuration');
      }

      toast.success('Global configuration saved successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      toast.error(errorMessage);
    }
  };

  const addParameterType = () => {
    const newType: ParameterType = {
      id: 0,
      name: '',
      sort_order: parameterTypes.length + 1,
      created_at: new Date().toISOString(),
    };
    setParameterTypes([...parameterTypes, newType]);
  };

  const addInputType = () => {
    const newType: InputType = {
      id: 0,
      name: '',
      sort_order: inputTypes.length + 1,
      created_at: new Date().toISOString(),
    };
    setInputTypes([...inputTypes, newType]);
  };

  const addPriorityLevel = () => {
    const newLevel: PriorityLevel = {
      id: 0,
      level: Math.max(...priorityLevels.map(p => p.level), 0) + 1,
      name: '',
      sort_order: priorityLevels.length + 1,
      created_at: new Date().toISOString(),
    };
    setPriorityLevels([...priorityLevels, newLevel]);
  };

  const updateParameterType = (index: number, value: string) => {
    const updated = [...parameterTypes];
    updated[index] = { ...updated[index], name: value };
    setParameterTypes(updated);
  };

  const updateInputType = (index: number, value: string) => {
    const updated = [...inputTypes];
    updated[index] = { ...updated[index], name: value };
    setInputTypes(updated);
  };

  const updatePriorityLevel = (index: number, value: string) => {
    const updated = [...priorityLevels];
    updated[index] = { ...updated[index], name: value };
    setPriorityLevels(updated);
  };

  const removeParameterType = (index: number) => {
    setParameterTypes(parameterTypes.filter((_, i) => i !== index));
  };

  const removeInputType = (index: number) => {
    setInputTypes(inputTypes.filter((_, i) => i !== index));
  };

  const removePriorityLevel = (index: number) => {
    setPriorityLevels(priorityLevels.filter((_, i) => i !== index));
  };

  useEffect(() => {
    // Wait for permissions to load before checking
    if (canManageGlobalConfig === null) {
      // Still loading permissions, don't redirect yet
      return;
    }
    
    // Check permissions after they're loaded
    if (!canManageGlobalConfig) {
      router.push('/admin/document-templates');
      return;
    }
    
    loadData();
  }, [canManageGlobalConfig, router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Global Configuration</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
            <p className="mt-2 text-gray-600">Loading global configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Global Configuration</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mb-4 text-6xl text-red-600">⚠️</div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Error Loading Configuration</h2>
            <p className="mb-4 text-gray-600">{error}</p>
            <Button onClick={loadData}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Global Configuration</h1>
        <Button onClick={saveData}>Save Configuration</Button>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="text-lg text-blue-600">ℹ️</div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Global Configuration</h3>
            <div className="mt-1 text-sm text-blue-700">
              <p>
                These settings are used across all templates. Sort order and level values are automatically managed.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Parameter Types */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Parameter Types</h3>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="New parameter type name"
                className="w-48"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = (e.target as HTMLInputElement).value.trim();
                    if (value) {
                      const newType: ParameterType = {
                        id: 0,
                        name: value,
                        sort_order: parameterTypes.length + 1,
                        created_at: new Date().toISOString(),
                      };
                      setParameterTypes([...parameterTypes, newType]);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <Button onClick={addParameterType} size="sm" variant="outline">
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {parameterTypes.map((type, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div className="flex-1">
                  <Input
                    value={type.name}
                    onChange={(e) => updateParameterType(index, e.target.value)}
                    placeholder="Parameter type name"
                    className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
                <Button
                  onClick={() => removeParameterType(index)}
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-900"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Input Types */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Input Types</h3>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="New input type name"
                className="w-48"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = (e.target as HTMLInputElement).value.trim();
                    if (value) {
                      const newType: InputType = {
                        id: 0,
                        name: value,
                        sort_order: inputTypes.length + 1,
                        created_at: new Date().toISOString(),
                      };
                      setInputTypes([...inputTypes, newType]);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <Button onClick={addInputType} size="sm" variant="outline">
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {inputTypes.map((type, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div className="flex-1">
                  <Input
                    value={type.name}
                    onChange={(e) => updateInputType(index, e.target.value)}
                    placeholder="Input type name"
                    className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
                <Button
                  onClick={() => removeInputType(index)}
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-900"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Levels */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Priority Levels</h3>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="New priority level name"
                className="w-48"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = (e.target as HTMLInputElement).value.trim();
                    if (value) {
                      const newLevel: PriorityLevel = {
                        id: 0,
                        level: Math.max(...priorityLevels.map(p => p.level), 0) + 1,
                        name: value,
                        sort_order: priorityLevels.length + 1,
                        created_at: new Date().toISOString(),
                      };
                      setPriorityLevels([...priorityLevels, newLevel]);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <Button onClick={addPriorityLevel} size="sm" variant="outline">
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {priorityLevels.map((level, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Level {level.level}:</span>
                    <Input
                      value={level.name}
                      onChange={(e) => updatePriorityLevel(index, e.target.value)}
                      placeholder="Priority level name"
                      className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => removePriorityLevel(index)}
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-900"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
