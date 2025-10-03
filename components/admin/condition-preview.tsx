'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Condition } from './condition-builder';

interface ConditionPreviewProps {
  condition: Condition | null;
  className?: string;
}

export function ConditionPreview({ condition, className = '' }: ConditionPreviewProps) {
  if (!condition) {
    return <div className={`text-sm text-gray-500 italic ${className}`}>No condition set</div>;
  }

  const renderCondition = (cond: Condition): React.ReactNode => {
    switch (cond.type) {
      case 'boolean':
        return (
          <span className="inline-flex items-center space-x-1">
            <Badge variant="outline" className="px-1 py-0 text-[10px]">
              BOOL
            </Badge>
            <span className="font-mono text-xs">@{cond.parameter}</span>
          </span>
        );

      case 'in':
        return (
          <span className="inline-flex items-center space-x-1">
            <Badge variant="outline" className="px-1 py-0 text-[10px]">
              IN
            </Badge>
            <span className="font-mono text-xs">@{cond.parameter}</span>
            <span className="text-xs text-gray-500">in</span>
            <span className="rounded bg-gray-100 px-1 py-0.5 text-xs">
              [{cond.values?.join(', ')}]
            </span>
          </span>
        );

      case 'and':
        return (
          <div className="space-y-1">
            <Badge variant="outline" className="px-1 py-0 text-[10px]">
              AND
            </Badge>
            <div className="ml-3 space-y-1">
              {cond.conditions?.map((subCondition, index) => (
                <div key={index} className="flex items-center space-x-1">
                  <span className="text-[10px] text-gray-400">#{index + 1}</span>
                  {renderCondition(subCondition)}
                </div>
              ))}
            </div>
          </div>
        );

      case 'or':
        return (
          <div className="space-y-1">
            <Badge variant="outline" className="px-1 py-0 text-[10px]">
              OR
            </Badge>
            <div className="ml-3 space-y-1">
              {cond.conditions?.map((subCondition, index) => (
                <div key={index} className="flex items-center space-x-1">
                  <span className="text-[10px] text-gray-400">#{index + 1}</span>
                  {renderCondition(subCondition)}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return <span className="text-red-500">Unknown condition type</span>;
    }
  };

  return <div className={`text-xs ${className}`}>{renderCondition(condition)}</div>;
}
