/**
 * Enhanced Form Field Component
 * Advanced form field with real-time validation, progress indicators, and compliance tracking
 * Cross-referenced with attached asset File 24 (Sponsor Form) and File 38 (Grant Management)
 */

import React, { useState, useEffect } from 'react';
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle, Eye, EyeOff, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdvancedFieldValidation } from '@/lib/validation';

interface EnhancedFormFieldProps {
  label: string;
  description?: string;
  type?: 'text' | 'email' | 'password' | 'textarea' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string | number) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  showProgress?: boolean;
  showCharacterCount?: boolean;
  showValidationStatus?: boolean;
  validationSchema?: any;
  className?: string;
  rows?: number;
  disabled?: boolean;
  autoComplete?: string;
  helpText?: string;
  fieldId?: string;
}

export const EnhancedFormField: React.FC<EnhancedFormFieldProps> = ({
  label,
  description,
  type = 'text',
  placeholder,
  value = '',
  onChange,
  onBlur,
  error,
  required = false,
  maxLength,
  minLength,
  showProgress = true,
  showCharacterCount = true,
  showValidationStatus = true,
  validationSchema,
  className,
  rows = 3,
  disabled = false,
  autoComplete,
  helpText,
  fieldId
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  
  const stringValue = String(value || '');
  const characterCount = stringValue.length;
  const progressPercentage = maxLength ? Math.min((characterCount / maxLength) * 100, 100) : 0;
  
  const { validateField, validationState } = useFieldValidation(validationSchema);

  useEffect(() => {
    if (hasBeenTouched && validationSchema) {
      validateField(value);
    }
  }, [value, hasBeenTouched, validateField, validationSchema]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = type === 'number' ? Number(e.target.value) : e.target.value;
    onChange?.(newValue);
    
    if (!hasBeenTouched) {
      setHasBeenTouched(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setHasBeenTouched(true);
    onBlur?.();
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const getValidationIcon = () => {
    if (!showValidationStatus || !hasBeenTouched) return null;
    
    if (error || validationState.hasError) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    
    if (validationState.hasWarning) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
    
    if (validationState.isValid && stringValue.length > 0) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    
    return null;
  };

  const getProgressColor = () => {
    if (!maxLength) return '';
    
    const percentage = progressPercentage;
    if (percentage < 50) return 'bg-red-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getCharacterCountColor = () => {
    if (!maxLength) return 'text-gray-500';
    
    const percentage = progressPercentage;
    if (percentage >= 95) return 'text-red-500';
    if (percentage >= 80) return 'text-yellow-500';
    return 'text-gray-500';
  };

  const renderInput = () => {
    const commonProps = {
      id: fieldId,
      placeholder,
      value: stringValue,
      onChange: handleInputChange,
      onFocus: handleFocus,
      onBlur: handleBlur,
      disabled,
      autoComplete,
      maxLength,
      className: cn(
        "pr-8",
        error || validationState.hasError ? "border-red-500 focus:border-red-500" : "",
        validationState.hasWarning ? "border-yellow-500 focus:border-yellow-500" : "",
        validationState.isValid && stringValue.length > 0 && !error ? "border-green-500 focus:border-green-500" : "",
        className
      )
    };

    if (type === 'textarea') {
      return (
        <div className="relative">
          <Textarea
            {...commonProps}
            rows={rows}
          />
          <div className="absolute top-2 right-2">
            {getValidationIcon()}
          </div>
        </div>
      );
    }

    if (type === 'password') {
      return (
        <div className="relative">
          <Input
            {...commonProps}
            type={showPassword ? 'text' : 'password'}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-8">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {getValidationIcon()}
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <Input
          {...commonProps}
          type={type}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          {getValidationIcon()}
        </div>
      </div>
    );
  };

  return (
    <FormItem className="space-y-2">
      <div className="flex items-center justify-between">
        <FormLabel className="flex items-center space-x-2">
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
          {helpText && (
            <div className="group relative">
              <Info className="w-3 h-3 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                {helpText}
              </div>
            </div>
          )}
        </FormLabel>
        
        {showValidationStatus && hasBeenTouched && (
          <div className="flex items-center space-x-1">
            {validationState.isValid && !error && stringValue.length > 0 && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Valid
              </Badge>
            )}
            {(error || validationState.hasError) && (
              <Badge variant="outline" className="text-red-600 border-red-600">
                Error
              </Badge>
            )}
            {validationState.hasWarning && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                Warning
              </Badge>
            )}
          </div>
        )}
      </div>

      <FormControl>
        {renderInput()}
      </FormControl>

      {/* Progress Bar */}
      {showProgress && maxLength && isFocused && (
        <div className="space-y-1">
          <Progress 
            value={progressPercentage} 
            className="h-1"
          />
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">
              {minLength && characterCount < minLength 
                ? `${minLength - characterCount} more characters needed`
                : 'Progress'
              }
            </span>
            <span className={getCharacterCountColor()}>
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* Character Count */}
      {showCharacterCount && maxLength && (
        <div className="flex justify-end">
          <span className={cn("text-xs", getCharacterCountColor())}>
            {characterCount}/{maxLength}
          </span>
        </div>
      )}

      {/* Description */}
      {description && (
        <FormDescription className="text-sm text-gray-500">
          {description}
        </FormDescription>
      )}

      {/* Error Message */}
      <FormMessage />

      {/* Validation Messages */}
      {hasBeenTouched && validationState.message && (
        <div className={cn(
          "text-xs p-2 rounded",
          validationState.hasError ? "text-red-700 bg-red-50 dark:bg-red-900/20" : "",
          validationState.hasWarning ? "text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20" : "",
          validationState.isValid ? "text-green-700 bg-green-50 dark:bg-green-900/20" : ""
        )}>
          {validationState.message}
        </div>
      )}
    </FormItem>
  );
};