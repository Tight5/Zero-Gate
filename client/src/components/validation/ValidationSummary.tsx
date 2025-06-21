/**
 * Validation Summary Component
 * Real-time validation status display with comprehensive error tracking
 * Cross-referenced with attached asset specifications for enterprise validation
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  section?: string;
}

export interface ValidationStatus {
  isValid: boolean;
  completedSteps: number;
  totalSteps: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  fieldCount: {
    completed: number;
    total: number;
    required: number;
  };
  estimatedTime?: string;
}

interface ValidationSummaryProps {
  status: ValidationStatus;
  showProgress?: boolean;
  showEstimatedTime?: boolean;
  compact?: boolean;
  className?: string;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  status,
  showProgress = true,
  showEstimatedTime = true,
  compact = false,
  className
}) => {
  const completionPercentage = (status.completedSteps / status.totalSteps) * 100;
  const fieldCompletionPercentage = (status.fieldCount.completed / status.fieldCount.total) * 100;
  
  const getStatusColor = () => {
    if (status.errors.length > 0) return 'text-red-600 dark:text-red-400';
    if (status.warnings.length > 0) return 'text-yellow-600 dark:text-yellow-400';
    if (status.isValid) return 'text-green-600 dark:text-green-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getStatusIcon = () => {
    if (status.errors.length > 0) return <XCircle className="w-5 h-5 text-red-500" />;
    if (status.warnings.length > 0) return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    if (status.isValid) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <Clock className="w-5 h-5 text-blue-500" />;
  };

  const getStatusText = () => {
    if (status.errors.length > 0) return 'Validation Errors';
    if (status.warnings.length > 0) return 'Validation Warnings';
    if (status.isValid) return 'Validation Complete';
    return 'Validation In Progress';
  };

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        {getStatusIcon()}
        <span className={cn("text-sm font-medium", getStatusColor())}>
          {getStatusText()}
        </span>
        <Badge variant="outline">
          {status.completedSteps}/{status.totalSteps}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </CardTitle>
        <CardDescription>
          Form validation status and completion progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Progress Section */}
        {showProgress && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Step Progress</span>
              <span className="text-sm text-gray-500">
                {status.completedSteps} of {status.totalSteps} completed
              </span>
            </div>
            <Progress value={completionPercentage} className="w-full" />
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Field Completion</span>
              <span className="text-sm text-gray-500">
                {status.fieldCount.completed} of {status.fieldCount.total} fields
              </span>
            </div>
            <Progress value={fieldCompletionPercentage} className="w-full" />
          </div>
        )}

        {/* Field Status Grid */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {status.fieldCount.completed}
            </div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {status.fieldCount.required}
            </div>
            <div className="text-xs text-gray-500">Required</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {status.fieldCount.total}
            </div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>

        {/* Estimated Time */}
        {showEstimatedTime && status.estimatedTime && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Estimated completion: {status.estimatedTime}
              </span>
            </div>
          </div>
        )}

        {/* Error Summary */}
        {status.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-200 flex items-center space-x-2">
              <XCircle className="w-4 h-4" />
              <span>Errors ({status.errors.length})</span>
            </h4>
            <div className="space-y-1">
              {status.errors.slice(0, 3).map((error, index) => (
                <div key={index} className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  <span className="font-medium">{error.field}:</span> {error.message}
                </div>
              ))}
              {status.errors.length > 3 && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  +{status.errors.length - 3} more errors
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warning Summary */}
        {status.warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>Warnings ({status.warnings.length})</span>
            </h4>
            <div className="space-y-1">
              {status.warnings.slice(0, 2).map((warning, index) => (
                <div key={index} className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                  <span className="font-medium">{warning.field}:</span> {warning.message}
                </div>
              ))}
              {status.warnings.length > 2 && (
                <div className="text-xs text-yellow-600 dark:text-yellow-400">
                  +{status.warnings.length - 2} more warnings
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success State */}
        {status.isValid && status.errors.length === 0 && status.warnings.length === 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                All validation checks passed successfully
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};