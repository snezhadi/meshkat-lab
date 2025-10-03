"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { ConditionEditor } from './condition-editor';
import { Condition } from './condition-builder';

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

interface ParameterEditModalProps {
  parameter: Parameter;
  config: ParameterConfig;
  allParameters: Parameter[];
  onSave: (parameter: Parameter) => void;
  onClose: () => void;
}

export function ParameterEditModal({ 
  parameter, 
  config,
  allParameters,
  onSave, 
  onClose 
}: ParameterEditModalProps) {
  const [editedParameter, setEditedParameter] = useState<Parameter>({ ...parameter });
  const [activeTab, setActiveTab] = useState<'basic' | 'metadata' | 'display' | 'options'>('basic');

  // Extract available parameter IDs (only boolean and enum types for condition editor)
  const availableParameterIds = allParameters
    .filter(param => param.type === 'boolean' || param.type === 'enum')
    .map(param => param.id);

  const handleSave = () => {
    onSave(editedParameter);
  };

  const handleChange = (path: string, value: any) => {
    setEditedParameter(prev => {
      const newParam = { ...prev };
      const keys = path.split('.');
      
      if (keys.length === 1) {
        (newParam as any)[keys[0]] = value;
      } else if (keys.length === 2) {
        if (!newParam[keys[0] as keyof Parameter]) {
          (newParam as any)[keys[0]] = {};
        }
        (newParam[keys[0] as keyof Parameter] as any)[keys[1]] = value;
      }
      
      return newParam;
    });
  };

  const addOption = () => {
    const newOptions = [...(editedParameter.options || []), ''];
    handleChange('options', newOptions);
  };

  const removeOption = (index: number) => {
    const newOptions = editedParameter.options?.filter((_, i) => i !== index) || [];
    handleChange('options', newOptions);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(editedParameter.options || [])];
    newOptions[index] = value;
    handleChange('options', newOptions);
  };

  // Get subgroups for selected group
  const availableSubgroups = editedParameter.display.group ? config.subgroups[editedParameter.display.group] || [] : [];

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📝' },
    { id: 'metadata', label: 'Metadata', icon: '⚙️' },
    { id: 'display', label: 'Display', icon: '🎨' },
    { id: 'options', label: 'Options', icon: '📋' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Parameter
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {editedParameter.id}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="id" className="text-sm font-medium text-gray-700">
                  Parameter ID *
                </Label>
                <Input
                  id="id"
                  value={editedParameter.id}
                  onChange={(e) => handleChange('id', e.target.value)}
                  placeholder="e.g., employment_start_date"
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Parameter Name *
                </Label>
                <Input
                  id="name"
                  value={editedParameter.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Employment Start Date"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={editedParameter.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Detailed description of the parameter..."
                  className="mt-1 min-h-[120px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type" className="text-sm font-medium text-gray-700">
                    Type *
                  </Label>
                  <select
                    id="type"
                    value={editedParameter.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {config.types.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <ConditionEditor
                    condition={editedParameter.condition}
                    onConditionChange={(condition) => handleChange('condition', condition)}
                    availableParameters={availableParameterIds}
                    label="Condition"
                    description="Define when this parameter should be shown or hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="priority" className="text-sm font-medium text-gray-700">
                  Priority
                </Label>
                <select
                  id="priority"
                  value={editedParameter.metadata?.priority ?? 0}
                  onChange={(e) => handleChange('metadata.priority', parseInt(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {config.priorities.map(priority => (
                    <option key={priority} value={priority}>Priority {priority}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="format" className="text-sm font-medium text-gray-700">
                  Format
                </Label>
                <Input
                  id="format"
                  value={editedParameter.metadata?.format || ''}
                  onChange={(e) => handleChange('metadata.format', e.target.value)}
                  placeholder="e.g., DD/MM/YYYY"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="llm_instructions" className="text-sm font-medium text-gray-700">
                  LLM Instructions
                </Label>
                <Textarea
                  id="llm_instructions"
                  value={editedParameter.metadata?.llm_instructions || ''}
                  onChange={(e) => handleChange('metadata.llm_instructions', e.target.value)}
                  placeholder="Instructions for LLM processing..."
                  className="mt-1 min-h-[120px]"
                />
              </div>
            </div>
          )}

          {activeTab === 'display' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="group" className="text-sm font-medium text-gray-700">
                    Group *
                  </Label>
                  <select
                    id="group"
                    value={editedParameter.display.group}
                    onChange={(e) => {
                      handleChange('display.group', e.target.value);
                      handleChange('display.subgroup', ''); // Reset subgroup
                    }}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {config.groups.map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="subgroup" className="text-sm font-medium text-gray-700">
                    Subgroup *
                  </Label>
                  <select
                    id="subgroup"
                    value={editedParameter.display.subgroup}
                    onChange={(e) => handleChange('display.subgroup', e.target.value)}
                    disabled={!editedParameter.display.group}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select subgroup...</option>
                    {availableSubgroups.map(subgroup => (
                      <option key={subgroup} value={subgroup}>{subgroup}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="label" className="text-sm font-medium text-gray-700">
                  Display Label *
                </Label>
                <Input
                  id="label"
                  value={editedParameter.display.label}
                  onChange={(e) => handleChange('display.label', e.target.value)}
                  placeholder="e.g., Start Date"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="input" className="text-sm font-medium text-gray-700">
                  Input Type *
                </Label>
                <select
                  id="input"
                  value={editedParameter.display.input}
                  onChange={(e) => handleChange('display.input', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {config.inputs.map(input => (
                    <option key={input} value={input}>{input}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'options' && editedParameter.type === 'enum' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">
                  Enum Options
                </Label>
                <Button
                  onClick={addOption}
                  size="sm"
                  variant="outline"
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-3">
                {(editedParameter.options || []).map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => removeOption(index)}
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {(!editedParameter.options || editedParameter.options.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>No options defined. Add options for this enum parameter.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'options' && editedParameter.type !== 'enum' && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">ℹ️</div>
              <p>Options are only available for enum type parameters.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
