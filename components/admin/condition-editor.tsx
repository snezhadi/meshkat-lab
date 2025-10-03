'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ConditionBuilder } from './condition-builder';
import { Condition } from './condition-builder';
import { ConditionPreview } from './condition-preview';

interface ConditionEditorProps {
  condition: Condition | string | null;
  onConditionChange: (condition: Condition | null) => void;
  availableParameters?: string[];
  label?: string;
  description?: string;
  className?: string;
}

export function ConditionEditor({
  condition,
  onConditionChange,
  availableParameters = [],
  label = 'Condition',
  description,
  className = '',
}: ConditionEditorProps) {
  const [showBuilder, setShowBuilder] = useState(false);

  // Convert string condition to Condition object if needed
  const getConditionObject = (): Condition | null => {
    if (!condition) return null;
    if (typeof condition === 'string') {
      // For backward compatibility, convert simple string conditions to boolean type
      return {
        type: 'boolean',
        parameter: condition,
      };
    }
    return condition;
  };

  const handleConditionChange = (newCondition: Condition | null) => {
    onConditionChange(newCondition);
    // Don't automatically close the builder - let user continue editing
  };

  const currentCondition = getConditionObject();

  return (
    <div className={`space-y-3 ${className}`}>
      {!currentCondition ? (
        <div className="flex justify-center py-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Create a basic boolean condition immediately
              const newCondition: Condition = {
                type: 'boolean',
                parameter: '',
              };
              onConditionChange(newCondition);
              // Automatically show the builder for immediate editing
              setShowBuilder(true);
            }}
            className="h-8 px-3"
          >
            Add Condition
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-700">{label}</Label>
              {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBuilder(!showBuilder)}
                className="h-7 text-xs"
              >
                {showBuilder ? 'Done' : 'Edit'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear this condition?')) {
                    onConditionChange(null);
                    setShowBuilder(false);
                  }
                }}
                className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Clear
              </Button>
            </div>
          </div>

          {!showBuilder && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <ConditionPreview condition={currentCondition} />
            </div>
          )}

          {showBuilder && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <ConditionBuilder
                condition={currentCondition}
                onConditionChange={handleConditionChange}
                availableParameters={availableParameters}
                hideHeader={true}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
