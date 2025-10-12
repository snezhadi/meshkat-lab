'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { ConditionEditor } from '@/components/admin/condition-editor';
import { MarkdownEditor } from '@/components/admin/markdown-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Parameter {
  id: string; // custom_id for frontend compatibility
  dbId?: number; // database primary key for API operations (optional for new parameters)
  name: string;
  description?: string;
  type: string;
  metadata?: {
    llm_instructions?: string;
    llm_description?: string;
    priority?: number;
    format?: string;
  };
  condition?: any;
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

interface Config {
  groups: string[];
  subgroups: { [key: string]: string[] };
}

interface GlobalConfig {
  types: string[];
  priorities: number[];
  inputs: string[];
}

interface Jurisdiction {
  jurisdiction: string;
  country: string;
}

export default function CreateParameterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [allParameters, setAllParameters] = useState<Parameter[]>([]);
  const [templateId, setTemplateId] = useState<string>('');
  const [config, setConfig] = useState<Config>({
    groups: [],
    subgroups: {},
  });
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
    types: [],
    priorities: [],
    inputs: [],
  });
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);

  const [parameter, setParameter] = useState<Parameter>({
    id: '',
    name: '',
    description: '',
    type: 'short-text',
    metadata: {
      llm_instructions: '',
      priority: 0,
      format: '',
    },
    condition: null,
    display: {
      group: '',
      subgroup: '',
      label: '',
    },
    options: [],
    defaults: {
      global_default: null,
      jurisdictions: [],
    },
  });

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get template ID from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const templateIdParam = urlParams.get('templateId');
      
      if (!templateIdParam) {
        throw new Error('Template ID is required');
      }
      
      setTemplateId(templateIdParam);

      const [parametersResponse, jurisdictionsResponse, globalConfigResponse] = await Promise.all([
        fetch(`/api/admin/parameters?templateId=${templateIdParam}`),
        fetch('/api/admin/jurisdictions'),
        fetch('/api/admin/global-configuration'),
      ]);

      if (!parametersResponse.ok || !jurisdictionsResponse.ok) {
        throw new Error('Failed to load data');
      }

      const [parametersData, jurisdictionsData, globalConfigData] = await Promise.all([
        parametersResponse.json(),
        jurisdictionsResponse.json(),
        globalConfigResponse.ok ? globalConfigResponse.json() : { success: false },
      ]);

      const { parameters: parametersList, config: configData } = parametersData;

      setAllParameters(parametersList);
      setConfig(configData);
      setJurisdictions(jurisdictionsData);

      // Set global configuration
      if (globalConfigData.success) {
        setGlobalConfig({
          types: globalConfigData.parameterTypes?.map((t: any) => t.name) || [],
          priorities: globalConfigData.priorityLevels?.map((p: any) => p.level) || [],
          inputs: globalConfigData.inputTypes?.map((i: any) => i.name) || [],
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load parameter data');
      router.push('/admin/document-parameters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleChange = (field: string, value: any) => {
    setParameter((prev) => {
      const newParam = { ...prev };
      const keys = field.split('.');
      let current: any = newParam;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newParam;
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveAndExit = async () => {
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

      // Check if ID already exists
      if (allParameters.some((p) => p.id === parameter.id)) {
        toast.error('Parameter ID already exists');
        setSaving(false);
        return;
      }

      if (!templateId) {
        toast.error('Template ID not found');
        setSaving(false);
        return;
      }

      // Create only the new parameter
      const response = await fetch('/api/admin/parameters/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          custom_id: parameter.id,
          name: parameter.name,
          description: parameter.description,
          type: parameter.type,
          input_type: parameter.display?.input,
          priority: parameter.metadata?.priority,
          display_group: parameter.display?.group,
          display_subgroup: parameter.display?.subgroup,
          required: parameter.required,
          options: parameter.options,
          llm_instructions: parameter.metadata?.llm_instructions,
          llm_description: parameter.metadata?.llm_description,
          condition: parameter.condition,
          display_label: parameter.display?.label,
          format: parameter.metadata?.format,
          global_default: parameter.defaults?.global_default,
          template_id: templateId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save parameter');
      }

      toast.success('Parameter created successfully');
      setHasUnsavedChanges(false);
      // Navigate back (template selection is in localStorage)
      router.push('/admin/document-parameters');
    } catch (error) {
      console.error('Error saving parameter:', error);
      toast.error('Failed to save parameter');
    } finally {
      setSaving(false);
    }
  };


  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        router.push('/admin/document-parameters');
      }
    } else {
      router.push('/admin/document-parameters');
    }
  };

  const handleAddJurisdictionDefault = () => {
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
    if (!parameter.defaults) return;
    const updatedParameter = { ...parameter };
    if (updatedParameter.defaults && updatedParameter.defaults.jurisdictions) {
      updatedParameter.defaults.jurisdictions[index] = { jurisdiction, default: defaultValue };
    }
    setParameter(updatedParameter);
    setHasUnsavedChanges(true);
  };

  const handleRemoveJurisdictionDefault = (index: number) => {
    if (!parameter.defaults) return;
    const updatedParameter = { ...parameter };
    if (updatedParameter.defaults && updatedParameter.defaults.jurisdictions) {
      updatedParameter.defaults.jurisdictions = updatedParameter.defaults.jurisdictions.filter(
        (_, i) => i !== index
      );
    }
    setParameter(updatedParameter);
    setHasUnsavedChanges(true);
  };

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
      case 'percent':
        return 'numberbox';
      case 'duration':
        return 'durationbox';
      case 'date':
        return 'datepicker';
      case 'time':
        return 'timepicker';
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
      case 'timepicker':
        return (
          <Input
            id={id}
            type="time"
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
            placeholder={paramType === 'percent' ? 'e.g., 25.5' : placeholder}
            step={paramType === 'percent' ? '0.1' : undefined}
            min={paramType === 'percent' ? '0' : undefined}
            max={paramType === 'percent' ? '100' : undefined}
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
    return (
      <Input
        id={id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={placeholder}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl p-6">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">Create Parameter</CardTitle>
                <p className="mt-1 text-sm text-gray-600">Create a new contract parameter</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSaveAndExit} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save & Exit'}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center space-x-2 text-sm text-gray-600">
          <button
            onClick={() => router.push('/admin/document-parameters')}
            className="flex items-center hover:text-blue-600"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Document Parameters
          </button>
          <span>/</span>
          <span>Create Parameter</span>
        </nav>

        {/* Basic Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="id" className="text-sm font-medium text-gray-700">
                  Parameter ID *
                </Label>
                <Input
                  id="id"
                  value={parameter.id}
                  onChange={(e) => handleChange('id', e.target.value)}
                  placeholder="e.g., employment_salary_amount"
                  className={`mt-1 ${parameter.id && !/^[a-zA-Z0-9_]+$/.test(parameter.id) ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
                {parameter.id && !/^[a-zA-Z0-9_]+$/.test(parameter.id) && (
                  <p className="mt-1 text-sm text-red-600">
                    Parameter ID can only contain letters, numbers, and underscores
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Parameter Name *
                </Label>
                <Input
                  id="name"
                  value={parameter.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Salary Amount"
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
                {globalConfig.types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Enum Options */}
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
                  placeholder="Enter each option on a new line"
                  rows={3}
                  className="mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Condition */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Condition</CardTitle>
          </CardHeader>
          <CardContent>
            <ConditionEditor
              condition={parameter.condition}
              onConditionChange={(condition: any) => handleChange('condition', condition)}
              availableParameters={allParameters.map((p) => p.name)}
            />
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card className="mb-6">
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

        {/* Defaults */}
        <Card className="mb-6">
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

        {/* Metadata */}
        <Card className="mb-6">
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
                  {globalConfig.priorities.map((priority) => (
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
      </div>
    </div>
  );
}
