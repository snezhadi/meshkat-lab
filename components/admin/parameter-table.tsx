'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, GripVertical, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

interface ParameterTableProps {
  parameters: Parameter[];
  onReorder: (reorderedParameters: Parameter[]) => void;
  config: ParameterConfig;
}

export function ParameterTable({ parameters, onReorder, config }: ParameterTableProps) {
  const router = useRouter();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newParameters = [...parameters];
    const draggedParameter = newParameters[draggedIndex];

    // Remove the dragged item
    newParameters.splice(draggedIndex, 1);

    // Insert it at the new position
    newParameters.splice(dropIndex, 0, draggedParameter);

    onReorder(newParameters);
    setDraggedIndex(null);
  };

  const handleDelete = async (parameterId: string) => {
    if (showDeleteConfirm === parameterId) {
      // Delete parameter directly via API
      const response = await fetch('/api/admin/parameters/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parameterId }),
      });

      if (response.ok) {
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        console.error('Failed to delete parameter');
        alert('Failed to delete parameter');
      }
      setShowDeleteConfirm(null);
    } else {
      setShowDeleteConfirm(parameterId);
    }
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      boolean: 'bg-green-100 text-green-800',
      text: 'bg-blue-100 text-blue-800',
      number: 'bg-purple-100 text-purple-800',
      currency: 'bg-yellow-100 text-yellow-800',
      duration: 'bg-orange-100 text-orange-800',
      date: 'bg-pink-100 text-pink-800',
      enum: 'bg-indigo-100 text-indigo-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getInputBadgeColor = (input: string) => {
    const colors: Record<string, string> = {
      checkbox: 'bg-green-100 text-green-800',
      textbox: 'bg-blue-100 text-blue-800',
      textarea: 'bg-blue-100 text-blue-800',
      numberbox: 'bg-purple-100 text-purple-800',
      datepicker: 'bg-pink-100 text-pink-800',
      dropdown: 'bg-indigo-100 text-indigo-800',
    };
    return colors[input] || 'bg-gray-100 text-gray-800';
  };

  if (parameters.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="mb-4 text-6xl text-gray-400">📋</div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">No Parameters Found</h3>
        <p className="text-gray-600">Try adjusting your filters or add a new parameter.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-8 px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              Drag
            </th>
            <th className="w-20 px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              Actions
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              Label/Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              Input
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              Priority
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              Group / Subgroup
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              Condition
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {parameters.map((parameter, index) => (
            <tr
              key={parameter.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`transition-colors hover:bg-gray-50 ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <td className="px-4 py-4 whitespace-nowrap">
                <GripVertical className="h-4 w-4 cursor-grab text-gray-400" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex justify-start space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/admin/document-parameters/edit/${parameter.id}`)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(parameter.id)}
                    className={`${
                      showDeleteConfirm === parameter.id
                        ? 'text-red-600 hover:text-red-900'
                        : 'text-red-400 hover:text-red-600'
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {showDeleteConfirm === parameter.id && (
                  <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs">
                    <div className="mb-1 font-medium text-red-800">Confirm Delete?</div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(parameter.id)}
                        className="bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Yes, Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowDeleteConfirm(null)}
                        className="px-2 py-1 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="max-w-xs truncate font-mono text-sm text-gray-900">
                  {parameter.id}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">{parameter.display.label}</div>
                <div className="max-w-xs truncate text-sm text-gray-500">{parameter.name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge className={getTypeBadgeColor(parameter.type)}>{parameter.type}</Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge className={getInputBadgeColor(parameter.display.input)}>
                  {parameter.display.input}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-900">{parameter.metadata?.priority ?? 0}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{parameter.display.group}</div>
                <div className="text-sm text-gray-500">{parameter.display.subgroup}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {parameter.condition ? (
                  <Badge className="bg-orange-100 text-orange-800">Yes</Badge>
                ) : (
                  <span className="text-sm text-gray-400">No</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
