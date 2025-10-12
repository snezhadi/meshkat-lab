'use client';

import React, { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ConditionPreview } from './condition-preview';

export interface Condition {
  type: 'boolean' | 'equals' | 'in' | 'and' | 'or';
  parameter?: string;
  value?: string;
  values?: string[];
  conditions?: Condition[];
}

interface Parameter {
  id: string;
  name: string;
  type: string;
  options?: string[];
}

interface ConditionBuilderProps {
  condition: Condition | null;
  onConditionChange: (condition: Condition | null) => void;
  availableParameters: string[];
  className?: string;
  hideHeader?: boolean;
}

export function ConditionBuilder({
  condition,
  onConditionChange,
  availableParameters,
  className = '',
  hideHeader = false,
}: ConditionBuilderProps) {
  const [localCondition, setLocalCondition] = useState<Condition | null>(condition);
  const [showBuilder, setShowBuilder] = useState(false);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [parameterSearch, setParameterSearch] = useState('');
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLocalCondition(condition);
    // If condition exists, automatically show the builder
    if (condition) {
      setShowBuilder(true);
    }
  }, [condition]);

  // Load parameters from availableParameters prop or fetch from API
  useEffect(() => {
    if (availableParameters && availableParameters.length > 0) {
      // Use the passed availableParameters - convert to Parameter objects
      // We need to fetch parameter details to get type information
      const loadParameterDetails = async () => {
        try {
          // Find templateId from current URL or context
          const currentPath = window.location.pathname;
          const templateMatch = currentPath.match(/\/admin\/document-templates\/edit\/(\d+)/);
          
          if (templateMatch) {
            const templateId = templateMatch[1];
            const response = await fetch(`/api/admin/parameters?templateId=${templateId}`);
            const data = await response.json();
            const allParams = data.parameters;
            
            if (allParams && Array.isArray(allParams)) {
              // Filter to only parameters that are in availableParameters and are boolean/enum
              const filteredParams = allParams.filter(
                (param: any) => 
                  availableParameters.includes(param.id) && 
                  (param.type === 'boolean' || param.type === 'enum')
              );
              setParameters(filteredParams);
            } else {
              setParameters([]);
            }
          } else {
            // Fallback: create basic parameter objects from availableParameters
            const basicParams = availableParameters.map(paramId => ({
              id: paramId,
              name: paramId,
              type: 'boolean', // Default type
            }));
            setParameters(basicParams);
          }
        } catch (error) {
          console.error('Failed to load parameter details:', error);
          // Fallback: create basic parameter objects
          const basicParams = availableParameters.map(paramId => ({
            id: paramId,
            name: paramId,
            type: 'boolean',
          }));
          setParameters(basicParams);
        }
      };
      
      loadParameterDetails();
    } else {
      // No availableParameters provided, try to fetch from API (legacy behavior)
      const loadParameters = async () => {
        try {
          const response = await fetch('/api/admin/parameters');
          const data = await response.json();
          const allParams = data.parameters;
          
          if (!allParams || !Array.isArray(allParams)) {
            console.log('No parameters defined for condition builder');
            setParameters([]);
            return;
          }
          
          // Filter to only boolean and enum parameters
          const filteredParams = allParams.filter(
            (param: any) => param.type === 'boolean' || param.type === 'enum'
          );
          setParameters(filteredParams);
        } catch (error) {
          console.error('Failed to load parameters:', error);
          setParameters([]);
        }
      };
      loadParameters();
    }
  }, [availableParameters]);

  const updateCondition = (newCondition: Condition | null) => {
    console.log('=== updateCondition CALLED ===');
    console.log('newCondition:', newCondition);
    console.log('current localCondition:', localCondition);
    setLocalCondition(newCondition);
    onConditionChange(newCondition);
    console.log('=== END updateCondition ===');
  };

  // Helper function to update a nested condition in the root condition
  const updateNestedCondition = (
    rootCondition: Condition,
    path: string,
    updatedCondition: Condition
  ): Condition => {
    console.log('=== updateNestedCondition DEBUG ===');
    console.log('rootCondition:', rootCondition);
    console.log('path:', path);
    console.log('updatedCondition:', updatedCondition);

    const pathParts = path.split('.').map((p) => parseInt(p));
    console.log('pathParts:', pathParts);

    // Deep clone the root condition
    const newRootCondition = JSON.parse(JSON.stringify(rootCondition));

    // For a path like "0.1", we want to update the root condition's conditions array at index 1
    // We only need to navigate if the path has more than 2 parts (e.g., "0.1.0" for nested conditions)
    let current = newRootCondition;
    console.log('Starting navigation from root condition:', current);

    if (pathParts.length === 2) {
      // Simple case: path like "0.1" - update root.conditions[1]
      console.log('Simple path detected - updating root condition directly');
    } else {
      // Complex case: path like "0.2.1" - need to navigate deeper
      // For path "0.2.1": navigate to root.conditions[2], then update conditions[1]
      console.log('Complex path detected - navigating deeper');

      // For complex paths like "0.2.1", navigate directly to the parent condition
      // Skip all intermediate indices except the second-to-last one
      const parentIndex = pathParts[pathParts.length - 2];
      console.log(`=== COMPLEX PATH NAVIGATION DEBUG ===`);
      console.log(`Path: ${path}`);
      console.log(`Path parts: [${pathParts.join(', ')}]`);
      console.log(`Direct navigation to parent condition at index ${parentIndex}`);
      console.log('Starting from root condition type:', current.type);
      console.log('Root condition has conditions array:', !!current.conditions);
      console.log('Root conditions array length:', current.conditions?.length || 0);
      console.log('Root conditions structure:', current.conditions);

      if (current.conditions && current.conditions[parentIndex]) {
        current = current.conditions[parentIndex];
        console.log(`Successfully navigated to parent condition at index ${parentIndex}`);
        console.log('Parent condition type:', current.type);
        console.log('Parent condition has conditions array:', !!current.conditions);
        console.log('Parent conditions array length:', current.conditions?.length || 0);
        console.log('Parent conditions structure:', current.conditions);
      } else {
        console.error(
          'Invalid path - parent condition not found at index:',
          parentIndex,
          'available conditions:',
          current.conditions?.length || 0
        );
        console.error('Current condition structure:', current);
        console.log('=== END COMPLEX PATH NAVIGATION DEBUG (ERROR) ===');
        return rootCondition;
      }
      console.log('=== END COMPLEX PATH NAVIGATION DEBUG ===');
    }

    // Update the target condition
    const finalIndex = pathParts[pathParts.length - 1];
    console.log('Final index to update:', finalIndex);
    console.log('Current conditions array length:', current.conditions?.length);
    console.log('Current conditions:', current.conditions);

    if (current.conditions && current.conditions[finalIndex] !== undefined) {
      current.conditions[finalIndex] = updatedCondition;
      console.log('Updated condition at path:', path);
    } else {
      console.error(
        'Invalid path - final condition not found at index:',
        finalIndex,
        'available conditions:',
        current.conditions?.length || 0
      );
      return rootCondition;
    }

    console.log('Final newRootCondition:', newRootCondition);
    console.log('=== END updateNestedCondition DEBUG ===');
    return newRootCondition;
  };

  const createNewCondition = (type: Condition['type']): Condition => {
    switch (type) {
      case 'boolean':
        return { type: 'boolean', parameter: '', value: 'true' };
      case 'in':
        return { type: 'in', parameter: '', values: [] };
      case 'and':
      case 'or':
        return { type, conditions: [] };
      default:
        return { type: 'boolean', parameter: '', value: 'true' };
    }
  };

  const convertToComplexCondition = (
    existingCondition: Condition,
    newType: 'and' | 'or',
    updateFn: (condition: Condition) => void
  ) => {
    const newComplexCondition: Condition = {
      type: newType,
      conditions: [existingCondition], // Preserve the existing condition
    };
    updateFn(newComplexCondition);
  };

  const filteredParameters = parameters.filter((param) =>
    param.id.toLowerCase().includes(parameterSearch.toLowerCase())
  );

  const renderCondition = (
    condition: Condition,
    path: string = '0',
    parentCondition?: Condition,
    parentIndex?: number,
    rootCondition?: Condition
  ): React.ReactNode => {
    const updateThisCondition = (updatedCondition: Condition) => {
      console.log('=== updateThisCondition DEBUG ===');
      console.log('updatedCondition:', updatedCondition);
      console.log('parentCondition:', parentCondition);
      console.log('parentIndex:', parentIndex);
      console.log('path:', path);
      console.log('rootCondition:', rootCondition);

      if (rootCondition && path !== '0') {
        // Update nested condition using the root condition
        console.log('Updating nested condition in root');
        const newRootCondition = updateNestedCondition(rootCondition, path, updatedCondition);
        console.log('New root condition:', newRootCondition);
        updateCondition(newRootCondition);
      } else {
        // Update root condition
        console.log('Updating root condition');
        updateCondition(updatedCondition);
      }
      console.log('=== END updateThisCondition DEBUG ===');
    };

    // Handle AND/OR complex conditions
    if (condition.type === 'and' || condition.type === 'or') {
      return (
        <Card className="border">
          <CardHeader className="pt-2 pb-1">
            <CardTitle className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="px-1 py-0 text-xs">
                  {condition.type.toUpperCase()}
                </Badge>
                <span>{condition.type.toUpperCase()} Condition</span>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newCondition = { ...condition };
                    const emptyCondition = createNewCondition('boolean');
                    // Clear any inherited values to make it truly empty
                    emptyCondition.parameter = '';
                    emptyCondition.value = '';
                    emptyCondition.values = [];
                    newCondition.conditions = [...(newCondition.conditions || []), emptyCondition];
                    updateThisCondition(newCondition);
                  }}
                  className="h-5 w-8 p-0 text-xs"
                >
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to remove this condition?')) {
                      if (parentCondition && parentIndex !== undefined) {
                        // Remove this condition from its parent
                        console.log('=== REMOVE CONDITION DEBUG (First Button) ===');
                        console.log('Removing condition at parentIndex:', parentIndex);
                        console.log('Parent condition before removal:', parentCondition);
                        const newConditions =
                          parentCondition.conditions?.filter((_, i) => i !== parentIndex) || [];
                        console.log('New conditions after removal:', newConditions);
                        // Update the parent condition with the new conditions array
                        // Create a new parent condition with the updated conditions array
                        const updatedParentCondition = {
                          ...parentCondition,
                          conditions: newConditions,
                        };
                        console.log('Updated parent condition:', updatedParentCondition);

                        // Always update the root condition with the updated parent condition
                        if (rootCondition && path !== '0') {
                          // Find the parent's path by removing the last part of the current path
                          const parentPath = path.substring(0, path.lastIndexOf('.'));
                          console.log('Updating parent condition at path:', parentPath);

                          // For simple paths like "0.2", we can update directly
                          if (parentPath.includes('.')) {
                            // Complex nested path - use updateNestedCondition
                            const newRootCondition = updateNestedCondition(
                              rootCondition,
                              parentPath,
                              updatedParentCondition
                            );
                            updateCondition(newRootCondition);
                          } else {
                            // Simple path like "0" - this means we're updating the root condition itself
                            console.log('Before update - root condition:', rootCondition);
                            console.log('Updating root condition with updated parent condition');
                            updateCondition(updatedParentCondition);
                          }
                        } else {
                          // This parent condition is the root condition - update it directly
                          updateCondition(updatedParentCondition);
                        }
                        console.log('=== END REMOVE CONDITION DEBUG (First Button) ===');
                      } else {
                        // Remove the entire root condition
                        console.log('Removing entire root condition (First Button)');
                        updateCondition(null);
                        setShowBuilder(false);
                      }
                    }
                  }}
                  className="h-5 w-5 p-0 text-red-600"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-2">
            <div className="space-y-2">
              {(condition.conditions || []).map((subCondition, index) => (
                <div
                  key={`${path}-${index}-${subCondition.parameter || 'empty'}`}
                  className="relative"
                >
                  <div className="mb-1 flex items-center space-x-2">
                    <span className="text-[10px] text-gray-400">#{index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newConditions =
                          condition.conditions?.filter((_, i) => i !== index) || [];
                        updateThisCondition({ ...condition, conditions: newConditions });
                      }}
                      className="h-5 w-5 p-0 text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {renderCondition(
                    subCondition,
                    `${path}.${index}`,
                    condition,
                    index,
                    rootCondition || localCondition || undefined
                  )}
                </div>
              ))}

              {/* Add Condition Button */}
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newCondition = { ...condition };
                    const emptyCondition = createNewCondition('boolean');
                    // Clear any inherited values to make it truly empty
                    emptyCondition.parameter = '';
                    emptyCondition.value = '';
                    emptyCondition.values = [];
                    newCondition.conditions = [...(newCondition.conditions || []), emptyCondition];
                    updateThisCondition(newCondition);
                  }}
                  className="flex h-8 items-center space-x-1 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Condition</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Handle simple conditions (boolean/in)
    const currentParameter = condition.parameter
      ? parameters.find((p) => p.id === condition.parameter)
      : null;
    // Use a more robust unique ID that includes the condition structure
    const conditionId = `condition-${path}-${condition.parameter || 'empty'}-${condition.value || 'novalue'}-${JSON.stringify(condition.values || [])}`;
    const isOpen = openDropdowns.has(conditionId);

    const toggleDropdown = () => {
      console.log('=== toggleDropdown DEBUG ===');
      console.log('conditionId:', conditionId);
      console.log('isOpen:', isOpen);
      console.log('current openDropdowns:', Array.from(openDropdowns));

      const newOpenDropdowns = new Set(openDropdowns);
      if (isOpen) {
        newOpenDropdowns.delete(conditionId);
        console.log('Closing dropdown for:', conditionId);
      } else {
        newOpenDropdowns.add(conditionId);
        console.log('Opening dropdown for:', conditionId);
      }
      console.log('New openDropdowns:', Array.from(newOpenDropdowns));
      setOpenDropdowns(newOpenDropdowns);
      console.log('=== END toggleDropdown DEBUG ===');
    };

    return (
      <Card className="border">
        <CardHeader className="pt-2 pb-1">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-xs">
              {currentParameter && (
                <Badge variant="outline" className="px-1 py-0 text-xs">
                  {currentParameter.type === 'boolean' ? 'BOOLEAN' : 'ENUM'}
                </Badge>
              )}
              <span>Condition</span>
            </CardTitle>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => convertToComplexCondition(condition, 'and', updateThisCondition)}
                className="h-5 w-8 p-0 text-xs"
              >
                AND
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => convertToComplexCondition(condition, 'or', updateThisCondition)}
                className="h-5 w-8 p-0 text-xs"
              >
                OR
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm('Are you sure you want to remove this condition?')) {
                    if (parentCondition && parentIndex !== undefined) {
                      // Remove this condition from its parent
                      console.log('=== REMOVE CONDITION DEBUG ===');
                      console.log('Removing condition at parentIndex:', parentIndex);
                      console.log('Parent condition before removal:', parentCondition);
                      const newConditions =
                        parentCondition.conditions?.filter((_, i) => i !== parentIndex) || [];
                      console.log('New conditions after removal:', newConditions);
                      // Update the parent condition with the new conditions array
                      // Create a new parent condition with the updated conditions array
                      const updatedParentCondition = {
                        ...parentCondition,
                        conditions: newConditions,
                      };
                      console.log('Updated parent condition:', updatedParentCondition);

                      // Always update the root condition with the updated parent condition
                      if (rootCondition && path !== '0') {
                        // Find the parent's path by removing the last part of the current path
                        const parentPath = path.substring(0, path.lastIndexOf('.'));
                        console.log('Updating parent condition at path:', parentPath);

                        // For simple paths like "0.2", we can update directly
                        if (parentPath.includes('.')) {
                          // Complex nested path - use updateNestedCondition
                          const newRootCondition = updateNestedCondition(
                            rootCondition,
                            parentPath,
                            updatedParentCondition
                          );
                          updateCondition(newRootCondition);
                        } else {
                          // Simple path like "0" - this means we're updating the root condition itself
                          console.log('Before update - root condition:', rootCondition);
                          console.log('Updating root condition with updated parent condition');
                          updateCondition(updatedParentCondition);
                        }
                      } else {
                        // This parent condition is the root condition - update it directly
                        updateCondition(updatedParentCondition);
                      }
                      console.log('=== END REMOVE CONDITION DEBUG ===');
                    } else {
                      // Remove the entire root condition
                      console.log('Removing entire root condition');
                      updateCondition(null);
                      setShowBuilder(false);
                    }
                  }
                }}
                className="h-5 w-5 p-0 text-red-600"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pb-2">
          {/* Searchable Parameter Selector */}
          <div className="space-y-1">
            <Label className="text-xs">Parameter</Label>
            <Popover
              open={isOpen}
              onOpenChange={(open) => {
                console.log('=== Popover onOpenChange DEBUG ===');
                console.log('conditionId:', conditionId);
                console.log('open:', open);
                console.log('isOpen:', isOpen);

                if (!open) {
                  const newOpenDropdowns = new Set(openDropdowns);
                  newOpenDropdowns.delete(conditionId);
                  setOpenDropdowns(newOpenDropdowns);
                  console.log('Popover closing dropdown for:', conditionId);
                } else {
                  toggleDropdown();
                  console.log('Popover opening dropdown for:', conditionId);
                }
                console.log('=== END Popover onOpenChange DEBUG ===');
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isOpen}
                  disabled={parameters.length === 0}
                  className="h-8 w-full justify-between text-xs"
                >
                  {currentParameter ? (
                    <span>@{currentParameter.id}</span>
                  ) : parameters.length === 0 ? (
                    <span className="text-gray-400">No parameters available</span>
                  ) : (
                    <span className="text-gray-500">Select parameter...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search parameters..."
                    className="h-8"
                    value={parameterSearch}
                    onValueChange={setParameterSearch}
                  />
                  <CommandEmpty>
                    {parameters.length === 0 
                      ? "No parameters defined for this template. Please add parameters first." 
                      : "No parameter found."}
                  </CommandEmpty>
                  <CommandGroup className="max-h-48 overflow-auto">
                    {filteredParameters.map((param, index) => (
                      <CommandItem
                        key={`${param.id}-${index}`}
                        value={param.id}
                        onSelect={() => {
                          const newOpenDropdowns = new Set(openDropdowns);
                          newOpenDropdowns.delete(conditionId);
                          setOpenDropdowns(newOpenDropdowns);
                          setParameterSearch('');
                          const newCondition = { ...condition, parameter: param.id };
                          // Set default values based on parameter type
                          if (param.type === 'boolean') {
                            newCondition.type = 'boolean';
                            newCondition.value = 'true';
                          } else if (param.type === 'enum') {
                            newCondition.type = 'in';
                            newCondition.values = [];
                            console.log('=== ENUM CONDITION CREATED ===');
                            console.log('newCondition:', newCondition);
                            console.log('conditionId:', conditionId);
                            console.log('path:', path);
                          }
                          updateThisCondition(newCondition);
                        }}
                        className="text-xs"
                      >
                        <Check
                          className={`mr-2 h-3 w-3 ${
                            currentParameter?.id === param.id ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        <span className="font-medium">
                          <span className="mr-1 text-[10px] text-blue-600">
                            {param.type === 'boolean' ? 'BOOL' : 'ENUM'}
                          </span>
                          @{param.id}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Boolean Parameter: True/False Radio Buttons */}
          {currentParameter?.type === 'boolean' && (
            <div className="space-y-2">
              <Label className="text-xs">Value</Label>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`boolean-true-${conditionId}`}
                    name={`boolean-value-${conditionId}`}
                    checked={condition.value === 'true'}
                    onChange={() => updateThisCondition({ ...condition, value: 'true' })}
                    className="h-3 w-3"
                  />
                  <Label htmlFor={`boolean-true-${conditionId}`} className="text-xs">
                    True
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`boolean-false-${conditionId}`}
                    name={`boolean-value-${conditionId}`}
                    checked={condition.value === 'false'}
                    onChange={() => updateThisCondition({ ...condition, value: 'false' })}
                    className="h-3 w-3"
                  />
                  <Label htmlFor={`boolean-false-${conditionId}`} className="text-xs">
                    False
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Enum Parameter: Multiple Checkboxes */}
          {currentParameter?.type === 'enum' && currentParameter.options && (
            <div className="space-y-2">
              <Label className="text-xs">Select Values</Label>
              <div className="space-y-1">
                {currentParameter.options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`enum-${option}-${conditionId}`}
                      checked={condition.values?.includes(option) || false}
                      onCheckedChange={(checked) => {
                        const currentValues = condition.values || [];
                        const newValues = checked
                          ? [...currentValues, option]
                          : currentValues.filter((v) => v !== option);
                        updateThisCondition({ ...condition, values: newValues });
                      }}
                      className="h-3 w-3"
                    />
                    <Label htmlFor={`enum-${option}-${conditionId}`} className="text-xs">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <Label className="text-sm">Condition</Label>
          <div className="flex items-center space-x-1">
            {localCondition && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBuilder(!showBuilder)}
                className="h-7 text-xs"
              >
                {showBuilder ? 'Done' : 'Edit'}
              </Button>
            )}
            {localCondition && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear this condition?')) {
                    updateCondition(null);
                    setShowBuilder(false);
                  }
                }}
                className="h-7 text-xs text-red-600"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {localCondition && !showBuilder && (
        <div className="rounded border bg-gray-50 p-2">
          <ConditionPreview condition={localCondition} />
        </div>
      )}

      {showBuilder && (
        <div className="space-y-2">
          {renderCondition(
            localCondition || createNewCondition('boolean'),
            '0',
            undefined,
            undefined,
            localCondition || undefined
          )}
        </div>
      )}
    </div>
  );
}
