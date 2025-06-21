/**
 * Specification Compatibility Layer
 * Provides @replit/ui compatible components using shadcn/ui implementations
 * Cross-referenced with attached asset Files 20-41 component specifications
 */

import React from 'react';
import { Card as ShadcnCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button as ShadcnButton } from '@/components/ui/button';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Alert as ShadcnAlert, AlertDescription } from '@/components/ui/alert';
import { Badge as ShadcnBadge } from '@/components/ui/badge';
import { Checkbox as ShadcnCheckbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Card Component - File 24, 33, 37, 38 compatibility
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <ShadcnCard className={cn("w-full", className)}>
      {children}
    </ShadcnCard>
  );
};

// Heading Component - File 33, 37, 38 compatibility
interface HeadingProps {
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'xl';
  className?: string;
}

export const Heading: React.FC<HeadingProps> = ({ children, size = 'medium', className }) => {
  const sizeClasses = {
    small: 'text-lg font-semibold',
    medium: 'text-xl font-semibold',
    large: 'text-2xl font-bold',
    xl: 'text-3xl font-bold'
  };

  return (
    <h2 className={cn(sizeClasses[size], className)}>
      {children}
    </h2>
  );
};

// Input Component - File 33, 37, 38 compatibility
interface InputProps {
  id?: string;
  name?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

export const Input: React.FC<InputProps> = ({ 
  error, 
  className, 
  ...props 
}) => {
  return (
    <ShadcnInput 
      className={cn(
        error && "border-destructive focus-visible:ring-destructive",
        className
      )}
      {...props}
    />
  );
};

// Button Component - File 33, 37, 38 compatibility
interface ButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  loading,
  disabled,
  className,
  ...props 
}) => {
  const variantMap = {
    primary: 'default',
    secondary: 'secondary',
    destructive: 'destructive',
    outline: 'outline',
    ghost: 'ghost'
  } as const;

  const sizeMap = {
    small: 'sm',
    medium: 'default',
    large: 'lg'
  } as const;

  return (
    <ShadcnButton 
      variant={variantMap[variant]}
      size={sizeMap[size]}
      disabled={disabled || loading}
      className={cn(className)}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </ShadcnButton>
  );
};

// Spinner Component - File 24 compatibility
interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'medium', className }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-6 w-6',
    large: 'h-8 w-8'
  };

  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  );
};

// Alert Component - File 33 compatibility
interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ children, variant = 'default', className }) => {
  return (
    <ShadcnAlert 
      variant={variant === 'warning' ? 'default' : variant as any}
      className={cn(
        variant === 'warning' && "border-yellow-500 text-yellow-700",
        variant === 'success' && "border-green-500 text-green-700",
        className
      )}
    >
      {children}
    </ShadcnAlert>
  );
};

// Checkbox Component - File 33 compatibility
interface CheckboxProps {
  id?: string;
  name?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ 
  id, 
  name, 
  checked, 
  onChange, 
  disabled, 
  className 
}) => {
  return (
    <ShadcnCheckbox
      id={id}
      name={name}
      checked={checked}
      onCheckedChange={(checkedValue) => {
        if (onChange) {
          const syntheticEvent = {
            target: {
              name,
              type: 'checkbox',
              checked: checkedValue as boolean
            }
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }
      }}
      disabled={disabled}
      className={className}
    />
  );
};

// Badge Component for enhanced functionality
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className }) => {
  return (
    <ShadcnBadge variant={variant} className={className}>
      {children}
    </ShadcnBadge>
  );
};

// Router Compatibility for wouter -> react-router-dom
export { Link } from 'wouter';

// Navigate component compatibility
interface NavigateProps {
  to: string;
  replace?: boolean;
}

export const Navigate: React.FC<NavigateProps> = ({ to }) => {
  const [, setLocation] = require('wouter').useLocation();
  
  React.useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);

  return null;
};

// Export all compatibility components
export const SpecComponents = {
  Card,
  Heading,
  Input,
  Button,
  Spinner,
  Alert,
  Checkbox,
  Badge,
  Navigate
};