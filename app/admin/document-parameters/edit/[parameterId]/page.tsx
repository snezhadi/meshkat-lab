'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Condition } from '@/components/admin/condition-builder';
import { ConditionEditor } from '@/components/admin/condition-editor';
import { MarkdownEditor } from '@/components/admin/markdown-editor';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
  condition?: Condition | string | null;
  display: {
    group: string;
    subgroup: string;
    label: string;
  };
  options?: string[];
  defaults?: {
    global_default?: string | number | boolean | null;
    jurisdictions?: Array<{
      jurisdiction: string;
      default: string | number | boolean;
    }>;
  };
}

interface ParameterConfig {
  groups: string[];
  subgroups: Record<string, string[]>;
  types: string[];
  priorities: number[];
}

interface Jurisdiction {
  jurisdiction: string;
  country: string;
}

export default function ParameterEditPage() {
  const router = useRouter();
  const params = useParams();
  const parameterId = params.parameterId as string;

  const [parameter, setParameter] = useState<Parameter | null>(null);
  const [config, setConfig] = useState<ParameterConfig | null>(null);
  const [allParameters, setAllParameters] = useState<Parameter[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load parameter and config data
  useEffect(() => {
    loadData();
  }, [parameterId]);

  // Navigation warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handleLinkClick = (e: MouseEvent) => {
      if (hasUnsavedChanges) {
        const target = e.target as HTMLElement;
        const link = target.closest('a[href]');

        if (link) {
          const confirmed = window.confirm(
            'You have unsaved changes. Are you sure you want to leave?'
          );
          if (!confirmed) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }
      }
    };

    // Handle browser refresh/close
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Handle link clicks (including Next.js Link components)
    document.addEventListener('click', handleLinkClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [hasUnsavedChanges]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load parameters, config, and jurisdictions from API endpoints
      const [parametersResponse, jurisdictionsResponse] = await Promise.all([
        fetch('/api/admin/parameters'),
        fetch('/api/admin/jurisdictions'),
      ]);

      if (!parametersResponse.ok || !jurisdictionsResponse.ok) {
        throw new Error('Failed to load data');
      }

      const [parametersData, jurisdictionsData] = await Promise.all([
        parametersResponse.json(),
        jurisdictionsResponse.json(),
      ]);

      const { parameters: parametersList, config: configData } = parametersData;

      setAllParameters(parametersList);
      setConfig(configData);
      setJurisdictions(jurisdictionsData);

      // Find the specific parameter
      const foundParameter = parametersList.find((p: Parameter) => p.id === parameterId);
      if (!foundParameter) {
        throw new Error('Parameter not found');
      }

      // Ensure defaults structure exists
      if (!foundParameter.defaults) {
        foundParameter.defaults = {
          global_default: null,
          jurisdictions: [],
        };
      }

      console.log('Parameter loaded:', foundParameter.id, 'Defaults:', foundParameter.defaults);
      setParameter(foundParameter);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load parameter data');
      router.push('/admin/document-parameters');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (url: string) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    router.push(url);
  };

  const handleChange = (field: string, value: any) => {
    if (!parameter) return;

    const updatedParameter = { ...parameter };

    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'metadata') {
        updatedParameter.metadata = { ...updatedParameter.metadata, [child]: value };
      } else if (parent === 'display') {
        updatedParameter.display = { ...updatedParameter.display, [child]: value };
      } else if (parent === 'defaults') {
        if (child === 'global_default') {
          updatedParameter.defaults = { ...updatedParameter.defaults, global_default: value };
        }
      }
    } else {
      (updatedParameter as any)[field] = value;
    }

    setParameter(updatedParameter);
    setHasUnsavedChanges(true);
  };

  const handleAddJurisdictionDefault = () => {
    if (!parameter) return;

    const updatedParameter = { ...parameter };
    if (!updatedParameter.defaults) {
      updatedParameter.defaults = { global_default: null, jurisdictions: [] };
    }

    updatedParameter.defaults.jurisdictions = [
      ...(updatedParameter.defaults.jurisdictions || []),
      { jurisdiction: '', default: '' },
    ];

    setParameter(updatedParameter);
    setHasUnsavedChanges(true);
  };

  const handleUpdateJurisdictionDefault = (
    index: number,
    jurisdiction: string,
    defaultValue: string | number | boolean
  ) => {
    if (!parameter || !parameter.defaults) return;

    const updatedParameter = { ...parameter };
    if (updatedParameter.defaults && updatedParameter.defaults.jurisdictions) {
      updatedParameter.defaults.jurisdictions[index] = { jurisdiction, default: defaultValue };
    }

    setParameter(updatedParameter);
    setHasUnsavedChanges(true);
  };

  const handleRemoveJurisdictionDefault = (index: number) => {
    if (!parameter || !parameter.defaults) return;

    const updatedParameter = { ...parameter };
    if (updatedParameter.defaults && updatedParameter.defaults.jurisdictions) {
      updatedParameter.defaults.jurisdictions = updatedParameter.defaults.jurisdictions.filter(
        (_, i) => i !== index
      );
    }

    setParameter(updatedParameter);
    setHasUnsavedChanges(true);
  };

  const handleSave = async (shouldExit = false) => {
    if (!parameter || !config) return;

    try {
      setSaving(true);

      // Validate required fields
      if (!parameter.id.trim()) {
        toast.error('Parameter ID is required');
        setSaving(false);
        return;
      }

      if (!parameter.name.trim()) {
        toast.error('Parameter name is required');
        setSaving(false);
        return;
      }

      // Validate parameter ID format (alphanumeric and underscore only)
      const idRegex = /^[a-zA-Z0-9_]+$/;
      if (!idRegex.test(parameter.id)) {
        toast.error('Parameter ID can only contain letters, numbers, and underscores');
        setSaving(false);
        return;
      }

      // Check if ID already exists (excluding current parameter)
      if (allParameters.some((p) => p.id === parameter.id && p.id !== parameterId)) {
        toast.error('Parameter ID already exists');
        setSaving(false);
        return;
      }

      // Update the parameter in the list
      const updatedParameters = allParameters.map((p) => (p.id === parameterId ? parameter : p));

      const response = await fetch('/api/admin/parameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parameters: updatedParameters,
          config: config,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save parameter');
      }

      toast.success('Parameter saved successfully!');
      setHasUnsavedChanges(false);

      // Navigate based on the save action
      if (shouldExit) {
        router.push('/admin/document-parameters');
      }
      // If shouldExit is false, stay on current page (no navigation)
    } catch (err) {
      toast.error('Failed to save parameter');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    handleNavigation('/admin/document-parameters');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-32 w-32 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading parameter...</p>
        </div>
      </div>
    );
  }

  if (!parameter || !config) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">❌</div>
          <h2 className="mb-2 text-xl font-semibold">Parameter Not Found</h2>
          <p className="mb-4 text-gray-600">The parameter you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/admin/document-parameters')}>
            Back to Parameters
          </Button>
        </div>
      </div>
    );
  }

  // Extract available parameter IDs (only boolean and enum types for condition editor)
  const availableParameterIds = allParameters
    .filter((param) => param.type === 'boolean' || param.type === 'enum')
    .map((param) => param.id);

  // Render appropriate input based on parameter type
  // Helper function to infer input type from parameter type
  const getInputTypeFromParameterType = (paramType: string) => {
    switch (paramType) {
      case 'boolean':
        return 'checkbox';
      case 'short-text':
        return 'textbox';
      case 'long-text':
        return 'textarea';
      case 'number':
      case 'currency':
        return 'numberbox';
      case 'duration':
        return 'durationbox';
      case 'date':
        return 'datepicker';
      case 'enum':
        return 'dropdown';
      default:
        return 'textbox';
    }
  };

  const renderDefaultInput = (
    id: string,
    value: any,
    onChange: (value: any) => void,
    placeholder: string
  ) => {
    if (!parameter) return null;

    const inputType = getInputTypeFromParameterType(parameter.type);
    const paramType = parameter.type;

    switch (inputType) {
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={id}
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(checked === true)}
            />
            <Label htmlFor={id} className="text-sm">
              {value === true || value === 'true' ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        );

      case 'datepicker':
        return (
          <Input
            id={id}
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={placeholder}
          />
        );

      case 'numberbox':
        return (
          <Input
            id={id}
            type="number"
            value={value || ''}
            onChange={(e) => {
              // Only allow numbers and decimal point
              const numericValue = e.target.value.replace(/[^0-9.]/g, '');
              onChange(numericValue || null);
            }}
            onBlur={(e) => {
              // Validate on exit - ensure it's a valid number
              const numValue = parseFloat(e.target.value);
              if (e.target.value && !isNaN(numValue)) {
                onChange(numValue.toString());
              } else if (!e.target.value) {
                onChange(null);
              }
            }}
            placeholder={placeholder}
          />
        );

      case 'durationbox':
        return (
          <div className="flex space-x-2">
            <Input
              id={`${id}_value`}
              type="number"
              value={value ? value.replace(/[^0-9]/g, '') : ''}
              onChange={(e) => {
                // Only allow integers
                const intValue = e.target.value.replace(/[^0-9]/g, '');
                const currentUnit = value ? value.replace(/[^A-Z]/g, '') : 'D';
                onChange(intValue ? `${intValue}${currentUnit}` : null);
              }}
              placeholder="0"
              className="w-20"
            />
            <select
              id={`${id}_unit`}
              value={value ? value.replace(/[^A-Z]/g, '') : 'D'}
              onChange={(e) => {
                const currentValue = value ? value.replace(/[^0-9]/g, '') : '';
                onChange(currentValue ? `${currentValue}${e.target.value}` : null);
              }}
              className="rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="H">Hours</option>
              <option value="D">Days</option>
              <option value="W">Weeks</option>
              <option value="M">Months</option>
              <option value="Y">Years</option>
            </select>
          </div>
        );

      case 'dropdown':
        if (paramType === 'enum' && parameter.options) {
          return (
            <select
              id={id}
              value={value || ''}
              onChange={(e) => onChange(e.target.value || null)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Select option...</option>
              {parameter.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );
        }
        break;

      case 'textarea':
        return (
          <Textarea
            id={id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={placeholder}
            rows={3}
          />
        );

      case 'textbox':
      default:
        return (
          <Input
            id={id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={placeholder}
          />
        );
    }

    // Fallback to text input
    return (
      <Input
        id={id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={placeholder}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl p-6">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => handleNavigation('/admin/document-parameters')}
                className="cursor-pointer hover:text-blue-600"
              >
                Document Parameters
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit Parameter</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header Card */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Parameter</h1>
              <p className="mt-1 text-gray-600">{parameter.id}</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => handleNavigation('/admin/document-parameters')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={saving || !hasUnsavedChanges}
              >
                Save
              </Button>
              <Button onClick={() => handleSave(true)} disabled={saving}>
                Save & Exit
              </Button>
            </div>
          </div>
        </div>

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-center">
              <div className="mr-3 text-yellow-600">⚠️</div>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Unsaved Changes</h3>
                <p className="text-sm text-yellow-700">
                  You have unsaved changes. Don't forget to save your work.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Sections */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="id" className="text-sm font-medium text-gray-700">
                    Parameter ID
                  </Label>
                  <Input
                    id="id"
                    value={parameter.id}
                    onChange={(e) => handleChange('id', e.target.value)}
                    className={`mt-1 font-mono ${parameter.id && !/^[a-zA-Z0-9_]+$/.test(parameter.id) ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {parameter.id && !/^[a-zA-Z0-9_]+$/.test(parameter.id) && (
                    <p className="mt-1 text-sm text-red-600">
                      Parameter ID can only contain letters, numbers, and underscores
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={parameter.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <div className="mt-1">
                  <MarkdownEditor
                    content={parameter.description || ''}
                    onChange={(content) => handleChange('description', content)}
                    placeholder="Enter parameter description..."
                    enableParameters={false}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="type" className="text-sm font-medium text-gray-700">
                  Type
                </Label>
                <select
                  id="type"
                  value={parameter.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {config.types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Options Field (for enum types) */}
              {parameter.type === 'enum' && (
                <div>
                  <Label htmlFor="options" className="text-sm font-medium text-gray-700">
                    Enum Options
                  </Label>
                  <Textarea
                    id="options"
                    value={parameter.options?.join('\n') || ''}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n');
                      handleChange('options', lines);
                    }}
                    className="mt-1"
                    rows={3}
                    placeholder="Enter each option on a new line"
                  />
                  <p className="mt-1 text-xs text-gray-500">Enter each option on a separate line</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Condition */}
          <Card>
            <CardHeader>
              <CardTitle>Condition</CardTitle>
            </CardHeader>
            <CardContent>
              <ConditionEditor
                condition={parameter.condition || null}
                onConditionChange={(condition) => handleChange('condition', condition)}
                availableParameters={availableParameterIds}
                label="Condition"
                description="Define when this parameter should be shown or hidden"
              />
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="priority" className="text-sm font-medium text-gray-700">
                    Priority
                  </Label>
                  <select
                    id="priority"
                    value={parameter.metadata?.priority || 0}
                    onChange={(e) => handleChange('metadata.priority', parseInt(e.target.value))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {config.priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="format" className="text-sm font-medium text-gray-700">
                    Format
                  </Label>
                  <Input
                    id="format"
                    value={parameter.metadata?.format || ''}
                    onChange={(e) => handleChange('metadata.format', e.target.value)}
                    className="mt-1"
                    placeholder="e.g., MM/DD/YYYY"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="llm_instructions" className="text-sm font-medium text-gray-700">
                  LLM Instructions
                </Label>
                <Textarea
                  id="llm_instructions"
                  value={parameter.metadata?.llm_instructions || ''}
                  onChange={(e) => handleChange('metadata.llm_instructions', e.target.value)}
                  className="mt-1"
                  rows={12}
                  placeholder="Instructions for AI processing..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Defaults */}
          <Card>
            <CardHeader>
              <CardTitle>Defaults</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Global Default */}
              <div>
                <Label htmlFor="global_default" className="text-sm font-medium text-gray-700">
                  Global Default
                </Label>
                {renderDefaultInput(
                  'global_default',
                  parameter.defaults?.global_default,
                  (value) => handleChange('defaults.global_default', value),
                  'Enter global default value...'
                )}
              </div>

              {/* Jurisdiction Defaults */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">Jurisdiction Defaults</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddJurisdictionDefault}
                  >
                    Add Jurisdiction Default
                  </Button>
                </div>

                {parameter.defaults?.jurisdictions?.map((jurisdictionDefault, index) => (
                  <div
                    key={index}
                    className="mb-2 flex items-center space-x-2 rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">Jurisdiction</Label>
                      <select
                        value={jurisdictionDefault.jurisdiction}
                        onChange={(e) =>
                          handleUpdateJurisdictionDefault(
                            index,
                            e.target.value,
                            jurisdictionDefault.default
                          )
                        }
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">Select jurisdiction...</option>
                        {jurisdictions.map((jurisdiction) => (
                          <option key={jurisdiction.jurisdiction} value={jurisdiction.jurisdiction}>
                            {jurisdiction.jurisdiction} ({jurisdiction.country})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">Default Value</Label>
                      <div className="mt-1">
                        {renderDefaultInput(
                          `jurisdiction_default_${index}`,
                          jurisdictionDefault.default,
                          (value) =>
                            handleUpdateJurisdictionDefault(
                              index,
                              jurisdictionDefault.jurisdiction,
                              value
                            ),
                          'Default value...'
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveJurisdictionDefault(index)}
                      className="mt-6 text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}

                {(!parameter.defaults?.jurisdictions ||
                  parameter.defaults.jurisdictions.length === 0) && (
                  <div className="py-4 text-center text-sm text-gray-500">
                    No jurisdiction-specific defaults set
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Display Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="group" className="text-sm font-medium text-gray-700">
                    Group
                  </Label>
                  <select
                    id="group"
                    value={parameter.display.group}
                    onChange={(e) => handleChange('display.group', e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {config.groups.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="subgroup" className="text-sm font-medium text-gray-700">
                    Subgroup
                  </Label>
                  <select
                    id="subgroup"
                    value={parameter.display.subgroup}
                    onChange={(e) => handleChange('display.subgroup', e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {config.subgroups[parameter.display.group]?.map((subgroup) => (
                      <option key={subgroup} value={subgroup}>
                        {subgroup}
                      </option>
                    )) || <option value="">No subgroups available</option>}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="label" className="text-sm font-medium text-gray-700">
                  Label
                </Label>
                <Input
                  id="label"
                  value={parameter.display.label}
                  onChange={(e) => handleChange('display.label', e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
