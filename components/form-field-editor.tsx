'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'address' | 'textarea' | 'selectable_table';
  width?: 'full' | 'half' | 'third' | 'quarter' | 'two-thirds' | 'three-quarters';
  rows?: number;
  required?: boolean;
}

interface FormFieldEditorProps {
  fields: FormField[];
  onFieldsChange: (fields: FormField[]) => void;
  onClose: () => void;
}

export function FormFieldEditor({ fields, onFieldsChange, onClose }: FormFieldEditorProps) {
  const [editingFields, setEditingFields] = useState<FormField[]>(fields);

  const widthOptions = [
    { value: 'quarter', label: '25% (Quarter)', cols: 3 },
    { value: 'third', label: '33% (Third)', cols: 4 },
    { value: 'half', label: '50% (Half)', cols: 6 },
    { value: 'two-thirds', label: '67% (Two Thirds)', cols: 8 },
    { value: 'three-quarters', label: '75% (Three Quarters)', cols: 9 },
    { value: 'full', label: '100% (Full)', cols: 12 },
  ];

  const typeOptions = [
    { value: 'text', label: 'Text Input' },
    { value: 'email', label: 'Email Input' },
    { value: 'phone', label: 'Phone Input' },
    { value: 'date', label: 'Date Input' },
    { value: 'address', label: 'Address Input' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'selectable_table', label: 'Selectable Table' },
  ];

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...editingFields];
    newFields[index] = { ...newFields[index], ...updates };
    setEditingFields(newFields);
  };

  const addField = () => {
    const newField: FormField = {
      name: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      width: 'half',
      required: false,
    };
    setEditingFields([...editingFields, newField]);
  };

  const removeField = (index: number) => {
    const newFields = editingFields.filter((_, i) => i !== index);
    setEditingFields(newFields);
  };

  const saveChanges = () => {
    onFieldsChange(editingFields);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Form Field Editor
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure the layout and properties of each form field
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {editingFields.map((field, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Field Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Field Name
                    </label>
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateField(index, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  {/* Field Label */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  {/* Field Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, { type: e.target.value as FormField['type'] })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {typeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Width */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Width
                    </label>
                    <select
                      value={field.width || 'half'}
                      onChange={(e) => updateField(index, { width: e.target.value as FormField['width'] })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {widthOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Rows (for textarea) */}
                  {field.type === 'textarea' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Rows
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={field.rows || 3}
                        onChange={(e) => updateField(index, { rows: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  )}

                  {/* Required */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`required-${index}`}
                      checked={field.required || false}
                      onChange={(e) => updateField(index, { required: e.target.checked })}
                      className="mr-2"
                    />
                    <label htmlFor={`required-${index}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Required
                    </label>
                  </div>
                </div>

                {/* Remove Field Button */}
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeField(index)}
                  >
                    Remove Field
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Field Button */}
          <div className="mt-6">
            <Button onClick={addField} variant="outline" className="w-full">
              + Add New Field
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveChanges}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
