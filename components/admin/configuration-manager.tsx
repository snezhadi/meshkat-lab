'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ParameterConfig {
  groups: string[];
  subgroups: Record<string, string[]>;
}

interface Parameter {
  id: string;
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

interface ConfigurationManagerProps {
  config: ParameterConfig;
  parameters: Parameter[];
  onConfigChange: (config: ParameterConfig) => Promise<void>;
  savingConfig: boolean;
}

export function ConfigurationManager({
  config,
  parameters,
  onConfigChange,
  savingConfig,
}: ConfigurationManagerProps) {
  const [localConfig, setLocalConfig] = useState<ParameterConfig>(config);
  const [newGroup, setNewGroup] = useState('');
  const [newSubgroup, setNewSubgroup] = useState('');
  const [selectedGroupForSubgroup, setSelectedGroupForSubgroup] = useState('');

  const handleSave = () => {
    onConfigChange(localConfig);
  };

  // Validation functions to check if configurations are being used
  const isGroupInUse = (group: string) => {
    return parameters.some((param) => param.display.group === group);
  };

  const isSubgroupInUse = (group: string, subgroup: string) => {
    return parameters.some(
      (param) => param.display.group === group && param.display.subgroup === subgroup
    );
  };

  const addGroup = () => {
    if (newGroup.trim() && !localConfig.groups.includes(newGroup.trim())) {
      const updatedConfig = {
        ...localConfig,
        groups: [...localConfig.groups, newGroup.trim()],
      };
      setLocalConfig(updatedConfig);
      onConfigChange(updatedConfig);
      setNewGroup('');
    }
  };

  const removeGroup = (groupToRemove: string) => {
    if (isGroupInUse(groupToRemove)) {
      alert(
        `Cannot delete "${groupToRemove}" because it is being used by ${parameters.filter((p) => p.display.group === groupToRemove).length} parameter(s). Please change those parameters to use a different group first.`
      );
      return;
    }

    const updatedConfig = {
      ...localConfig,
      groups: localConfig.groups.filter((g) => g !== groupToRemove),
      subgroups: Object.fromEntries(
        Object.entries(localConfig.subgroups).filter(([key]) => key !== groupToRemove)
      ),
    };
    setLocalConfig(updatedConfig);
    setTimeout(() => onConfigChange(updatedConfig), 0);
  };

  const addSubgroup = () => {
    if (newSubgroup.trim() && selectedGroupForSubgroup) {
      const updatedConfig = {
        ...localConfig,
        subgroups: {
          ...localConfig.subgroups,
          [selectedGroupForSubgroup]: [
            ...(localConfig.subgroups[selectedGroupForSubgroup] || []),
            newSubgroup.trim(),
          ],
        },
      };
      setLocalConfig(updatedConfig);
      onConfigChange(updatedConfig);
      setNewSubgroup('');
    }
  };

  const removeSubgroup = (group: string, subgroupToRemove: string) => {
    if (isSubgroupInUse(group, subgroupToRemove)) {
      alert(
        `Cannot delete "${subgroupToRemove}" because it is being used by ${parameters.filter((p) => p.display.group === group && p.display.subgroup === subgroupToRemove).length} parameter(s). Please change those parameters to use a different subgroup first.`
      );
      return;
    }

    const updatedConfig = {
      ...localConfig,
      subgroups: {
        ...localConfig.subgroups,
        [group]: localConfig.subgroups[group]?.filter((s) => s !== subgroupToRemove) || [],
      },
    };
    setLocalConfig(updatedConfig);
    setTimeout(() => onConfigChange(updatedConfig), 0);
  };


  // Update localConfig when config prop changes
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const hasChanges = JSON.stringify(localConfig) !== JSON.stringify(config);

  // Debug log to help troubleshoot change detection
  useEffect(() => {
    console.log('Configuration change detection:', {
      hasChanges,
      localConfigGroups: localConfig.groups.length,
      configGroups: config.groups.length,
      localConfigSubgroups: Object.keys(localConfig.subgroups).length,
      configSubgroups: Object.keys(config.subgroups).length,
    });
  }, [hasChanges, localConfig, config]);

  return (
    <div className="space-y-8">
      {/* Loading Indicator */}
      {savingConfig && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm text-blue-800">Saving configuration changes...</div>
        </div>
      )}

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="text-lg text-blue-600">ℹ️</div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Configuration Management</h3>
            <div className="mt-1 text-sm text-blue-700">
              <p>
                Changes are saved automatically. Items that are currently being used by parameters
                cannot be deleted and are highlighted in blue with usage count (xx).
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Groups */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Groups</h3>
          <div className="flex items-center space-x-2">
            <Input
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              placeholder="New group name"
              className="w-48"
            />
            <Button onClick={addGroup} size="sm" variant="outline">
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {localConfig.groups.map((group) => {
            const inUse = isGroupInUse(group);
            const usageCount = parameters.filter((p) => p.display.group === group).length;

            return (
              <div
                key={group}
                className={`flex items-center justify-between rounded-lg p-3 ${
                  inUse ? 'border border-blue-200 bg-blue-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex-1">
                  <span
                    className={`text-sm font-medium ${inUse ? 'text-blue-900' : 'text-gray-900'}`}
                  >
                    {group}
                    {inUse && ` (${usageCount})`}
                  </span>
                </div>
                <Button
                  onClick={() => removeGroup(group)}
                  size="sm"
                  variant="ghost"
                  className={`${inUse ? 'cursor-not-allowed text-red-400' : 'text-red-600 hover:text-red-900'}`}
                  disabled={inUse}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subgroups */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Subgroups</h3>
          <div className="flex items-center space-x-2">
            <select
              value={selectedGroupForSubgroup}
              onChange={(e) => setSelectedGroupForSubgroup(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Select group...</option>
              {localConfig.groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
            <Input
              value={newSubgroup}
              onChange={(e) => setNewSubgroup(e.target.value)}
              placeholder="New subgroup name"
              className="w-48"
            />
            <Button
              onClick={addSubgroup}
              size="sm"
              variant="outline"
              disabled={!selectedGroupForSubgroup}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          {Object.entries(localConfig.subgroups).map(([group, subgroups]) => (
            <div key={group} className="rounded-lg border border-gray-200 p-4">
              <h4 className="mb-2 font-medium text-gray-900">{group}</h4>
              <div className="flex flex-wrap gap-2">
                {subgroups.map((subgroup) => {
                  const inUse = isSubgroupInUse(group, subgroup);
                  const usageCount = parameters.filter(
                    (p) => p.display.group === group && p.display.subgroup === subgroup
                  ).length;

                  return (
                    <div
                      key={`${group}-${subgroup}`}
                      className={`flex items-center justify-between rounded-lg p-3 ${
                        inUse ? 'border border-blue-200 bg-blue-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex-1">
                        <span
                          className={`text-sm font-medium ${inUse ? 'text-blue-900' : 'text-gray-900'}`}
                        >
                          {subgroup}
                          {inUse && ` (${usageCount})`}
                        </span>
                      </div>
                      <Button
                        onClick={() => removeSubgroup(group, subgroup)}
                        size="sm"
                        variant="ghost"
                        className={`${inUse ? 'cursor-not-allowed text-red-400' : 'text-red-600 hover:text-red-900'}`}
                        disabled={inUse}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
