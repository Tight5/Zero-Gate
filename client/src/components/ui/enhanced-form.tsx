/**
 * Enhanced Form Components with Real-time Validation
 * Comprehensive validation feedback system with visual indicators
 */

import React from 'react';
import { UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedFormFieldProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'password' | 'number';
  placeholder?: string;
  description?: string;
  required?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function EnhancedFormField<T extends FieldValues>({
  form,
  name,
  label,
  type = 'text',
  placeholder,
  description,
  required = false,
  children,
  className
}: EnhancedFormFieldProps<T>) {
  const hasError = !!form.formState.errors[name];
  const fieldValue = form.watch(name);
  const hasValue = fieldValue && String(fieldValue).length > 0;

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="flex items-center gap-2">
            {label} {required && <span className="text-destructive">*</span>}
            {hasError ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : hasValue ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : null}
          </FormLabel>
          <FormControl>
            {children || (
              <Input
                type={type}
                placeholder={placeholder}
                {...field}
                className={cn(
                  hasError && "border-destructive",
                  hasValue && !hasError && "border-green-500"
                )}
              />
            )}
          </FormControl>
          <FormMessage />
          {description && (
            <FormDescription className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              {description}
            </FormDescription>
          )}
        </FormItem>
      )}
    />
  );
}

interface EnhancedTextareaFieldProps<T extends FieldValues> extends EnhancedFormFieldProps<T> {
  rows?: number;
  maxLength?: number;
}

export function EnhancedTextareaField<T extends FieldValues>({
  form,
  name,
  label,
  placeholder,
  description,
  required = false,
  rows = 3,
  maxLength,
  className
}: EnhancedTextareaFieldProps<T>) {
  const hasError = !!form.formState.errors[name];
  const fieldValue = form.watch(name);
  const hasValue = fieldValue && String(fieldValue).length > 0;
  const currentLength = fieldValue ? String(fieldValue).length : 0;

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="flex items-center gap-2">
            {label} {required && <span className="text-destructive">*</span>}
            {hasError ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : hasValue ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : null}
          </FormLabel>
          <FormControl>
            <Textarea
              placeholder={placeholder}
              rows={rows}
              {...field}
              className={cn(
                hasError && "border-destructive",
                hasValue && !hasError && "border-green-500"
              )}
            />
          </FormControl>
          <FormMessage />
          {(description || maxLength) && (
            <FormDescription className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                {description}
              </span>
              {maxLength && (
                <span className={cn(
                  "text-xs",
                  currentLength > maxLength * 0.9 && "text-orange-500",
                  currentLength >= maxLength && "text-destructive"
                )}>
                  {currentLength}/{maxLength}
                </span>
              )}
            </FormDescription>
          )}
        </FormItem>
      )}
    />
  );
}

interface EnhancedSelectFieldProps<T extends FieldValues> extends EnhancedFormFieldProps<T> {
  options: Array<{ value: string; label: string; description?: string }>;
  defaultValue?: string;
}

export function EnhancedSelectField<T extends FieldValues>({
  form,
  name,
  label,
  placeholder = "Select an option",
  description,
  required = false,
  options,
  defaultValue,
  className
}: EnhancedSelectFieldProps<T>) {
  const hasError = !!form.formState.errors[name];
  const fieldValue = form.watch(name);
  const hasValue = fieldValue && String(fieldValue).length > 0;

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="flex items-center gap-2">
            {label} {required && <span className="text-destructive">*</span>}
            {hasError ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : hasValue ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : null}
          </FormLabel>
          <Select onValueChange={field.onChange} defaultValue={defaultValue || field.value}>
            <FormControl>
              <SelectTrigger className={cn(
                hasError && "border-destructive",
                hasValue && !hasError && "border-green-500"
              )}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div>{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
          {description && (
            <FormDescription className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              {description}
            </FormDescription>
          )}
        </FormItem>
      )}
    />
  );
}

interface EnhancedCheckboxFieldProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  description?: string;
  required?: boolean;
  className?: string;
}

export function EnhancedCheckboxField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  required = false,
  className
}: EnhancedCheckboxFieldProps<T>) {
  const hasError = !!form.formState.errors[name];
  const fieldValue = form.watch(name);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("flex flex-row items-start space-x-3 space-y-0", className)}>
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              className={cn(hasError && "border-destructive")}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel className="flex items-center gap-2">
              {label} {required && <span className="text-destructive">*</span>}
              {hasError ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : fieldValue ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : null}
            </FormLabel>
            {description && (
              <FormDescription className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                {description}
              </FormDescription>
            )}
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

interface ValidationSummaryProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  title?: string;
  showProgress?: boolean;
}

export function ValidationSummary<T extends FieldValues>({
  form,
  title = "Form Status",
  showProgress = true
}: ValidationSummaryProps<T>) {
  const errorCount = Object.keys(form.formState.errors).length;
  const fieldNames = Object.keys(form.formState.dirtyFields);
  const validFields = fieldNames.filter(name => !form.formState.errors[name]);
  const progress = fieldNames.length > 0 ? (validFields.length / fieldNames.length) * 100 : 0;

  return (
    <div className="bg-muted/50 p-4 rounded-lg border">
      <h4 className="font-medium mb-2 flex items-center gap-2">
        {title}
        {form.formState.isValid ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <AlertCircle className="h-4 w-4 text-orange-500" />
        )}
      </h4>
      <div className="text-sm space-y-2">
        {showProgress && fieldNames.length > 0 && (
          <div>
            <div className="flex justify-between mb-1">
              <span>Completion Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex justify-between">
          <span>Validation errors:</span>
          <span className={errorCount === 0 ? "text-green-600" : "text-red-600"}>
            {errorCount}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Form valid:</span>
          <span className={form.formState.isValid ? "text-green-600" : "text-orange-500"}>
            {form.formState.isValid ? "✓ Yes" : "○ No"}
          </span>
        </div>
      </div>
    </div>
  );
}