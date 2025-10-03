"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Filter, X } from 'lucide-react';

interface FilterState {
  search: string;
  group: string;
  subgroup: string;
  type: string;
  priority: string;
  hasCondition: string;
}

interface ParameterConfig {
  groups: string[];
  subgroups: Record<string, string[]>;
  types: string[];
  priorities: number[];
}

interface ParameterFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  config: ParameterConfig;
}

export function ParameterFilters({ filters, onFiltersChange, config }: ParameterFiltersProps) {
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      group: '',
      subgroup: '',
      type: '',
      priority: '',
      hasCondition: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  // Get subgroups for selected group
  const availableSubgroups = filters.group ? config.subgroups[filters.group] || [] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filters
        </h3>
        <button
          onClick={clearFilters}
          className={`text-sm flex items-center transition-colors ${
            hasActiveFilters 
              ? 'text-red-600 hover:text-red-700' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <X className="w-4 h-4 mr-1" />
          Clear all
        </button>
      </div>

      <div className="space-y-4">
        {/* First Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium text-gray-700">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="search"
                placeholder="Search parameters..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Group */}
          <div className="space-y-2">
            <Label htmlFor="group" className="text-sm font-medium text-gray-700">
              Group
            </Label>
            <select
              id="group"
              value={filters.group}
              onChange={(e) => handleFilterChange('group', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Groups</option>
              {config.groups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          {/* Subgroup */}
          <div className="space-y-2">
            <Label htmlFor="subgroup" className="text-sm font-medium text-gray-700">
              Subgroup
            </Label>
            <select
              id="subgroup"
              value={filters.subgroup}
              onChange={(e) => handleFilterChange('subgroup', e.target.value)}
              disabled={!filters.group}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">All Subgroups</option>
              {availableSubgroups.map(subgroup => (
                <option key={subgroup} value={subgroup}>{subgroup}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium text-gray-700">
              Type
            </Label>
            <select
              id="type"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              {config.types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="text-sm font-medium text-gray-700">
              Priority
            </Label>
            <select
              id="priority"
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="none">No Priority (0)</option>
              <option value="has">Has Priority (1+)</option>
              {config.priorities.slice(1).map(priority => (
                <option key={priority} value={priority.toString()}>Priority {priority}</option>
              ))}
            </select>
          </div>

          {/* Has Condition */}
          <div className="space-y-2">
            <Label htmlFor="hasCondition" className="text-sm font-medium text-gray-700">
              Has Condition
            </Label>
            <select
              id="hasCondition"
              value={filters.hasCondition}
              onChange={(e) => handleFilterChange('hasCondition', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2">
          {filters.search && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Search: {filters.search}
            </span>
          )}
          {filters.group && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Group: {filters.group}
            </span>
          )}
          {filters.subgroup && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Subgroup: {filters.subgroup}
            </span>
          )}
          {filters.type && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Type: {filters.type}
            </span>
          )}
          {filters.priority && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Priority: {filters.priority === 'none' ? 'None' : filters.priority === 'has' ? 'Has Priority' : `Priority ${filters.priority}`}
            </span>
          )}
          {filters.hasCondition && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Condition: {filters.hasCondition === 'yes' ? 'Yes' : 'No'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}