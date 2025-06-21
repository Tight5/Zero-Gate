/**
 * Enhanced Frontend Validation Utilities
 * Comprehensive validation patterns with error handling and user feedback
 */

import { z } from 'zod';
import { useState, useCallback } from 'react';

// Common validation patterns
export const validationPatterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  domain: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  alphaNumeric: /^[a-zA-Z0-9\s&.,'-]+$/,
  personName: /^[a-zA-Z\s'-]+$/,
  text: /^[a-zA-Z0-9\s\-_.,!?()&]+$/,
  orgName: /^[a-zA-Z0-9\s\-_.,&()]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
};

// Enhanced error messages
export const errorMessages = {
  required: (field: string) => `${field} is required`,
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  url: 'Please enter a valid URL',
  domain: 'Please enter a valid domain',
  minLength: (field: string, min: number) => `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) => `${field} must be less than ${max} characters`,
  minValue: (field: string, min: number) => `${field} must be at least ${min}`,
  maxValue: (field: string, max: number) => `${field} cannot exceed ${max}`,
  invalidCharacters: (field: string) => `${field} contains invalid characters`,
  futureDate: 'Date must be in the future',
  pastDate: 'Date must be in the past',
  strongPassword: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  passwordMatch: 'Passwords do not match',
};

// Enhanced Login Form Schema
export const loginFormSchema = z.object({
  email: z.string()
    .min(1, errorMessages.required('Email'))
    .email(errorMessages.email)
    .max(255, errorMessages.maxLength('Email', 255)),
  password: z.string()
    .min(1, errorMessages.required('Password'))
    .min(6, errorMessages.minLength('Password', 6))
    .max(100, errorMessages.maxLength('Password', 100)),
  rememberMe: z.boolean().default(false),
});

// Enhanced Sponsor Form Schema
export const sponsorFormSchema = z.object({
  name: z.string()
    .min(1, errorMessages.required('Sponsor name'))
    .max(255, errorMessages.maxLength('Sponsor name', 255))
    .regex(validationPatterns.alphaNumeric, errorMessages.invalidCharacters('Sponsor name')),
  organization: z.string()
    .min(1, errorMessages.required('Organization'))
    .max(255, errorMessages.maxLength('Organization', 255)),
  email: z.string()
    .email(errorMessages.email)
    .max(255, errorMessages.maxLength('Email', 255))
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .regex(validationPatterns.phone, errorMessages.phone)
    .optional()
    .or(z.literal('')),
  domain: z.string()
    .regex(validationPatterns.domain, errorMessages.domain)
    .max(255, errorMessages.maxLength('Domain', 255))
    .optional()
    .or(z.literal('')),
  type: z.enum(['foundation', 'government', 'corporation', 'individual', 'other'], {
    errorMap: () => ({ message: 'Please select a valid sponsor type' })
  }),
  relationshipManager: z.string()
    .max(255, errorMessages.maxLength('Relationship manager', 255))
    .optional()
    .or(z.literal('')),
  relationshipStrength: z.number()
    .int('Relationship strength must be a whole number')
    .min(1, errorMessages.minValue('Relationship strength', 1))
    .max(10, errorMessages.maxValue('Relationship strength', 10))
    .default(5),
  tags: z.array(z.string().min(1, 'Tag cannot be empty')).optional(),
  notes: z.string()
    .max(5000, errorMessages.maxLength('Notes', 5000))
    .optional()
    .or(z.literal('')),
});

// Enhanced Grant Form Step Schemas
export const grantFormStepSchemas = {
  basicInfo: z.object({
    title: z.string()
      .min(1, errorMessages.required('Grant title'))
      .max(255, errorMessages.maxLength('Grant title', 255)),
    organization: z.string()
      .min(1, errorMessages.required('Organization'))
      .max(255, errorMessages.maxLength('Organization', 255)),
    amount: z.number()
      .positive('Grant amount must be positive')
      .max(999999999.99, 'Grant amount is too large')
      .optional(),
    submissionDeadline: z.date({
      required_error: errorMessages.required('Submission deadline'),
      invalid_type_error: 'Please enter a valid date'
    }).refine((date) => date > new Date(), {
      message: errorMessages.futureDate
    }),
    category: z.enum(['research', 'education', 'community', 'technology', 'healthcare', 'environment', 'arts', 'other'], {
      errorMap: () => ({ message: 'Please select a valid category' })
    }),
    status: z.enum(['draft', 'planning', 'in_progress'], {
      errorMap: () => ({ message: 'Please select a valid status' })
    }).default('draft'),
  }),
  
  details: z.object({
    description: z.string()
      .min(50, errorMessages.minLength('Description', 50))
      .max(5000, errorMessages.maxLength('Description', 5000)),
    objectives: z.string()
      .min(20, errorMessages.minLength('Objectives', 20))
      .max(2000, errorMessages.maxLength('Objectives', 2000)),
    methodology: z.string()
      .min(20, errorMessages.minLength('Methodology', 20))
      .max(2000, errorMessages.maxLength('Methodology', 2000)),
    budget: z.string()
      .min(20, errorMessages.minLength('Budget details', 20))
      .max(2000, errorMessages.maxLength('Budget details', 2000)),
    timeline: z.string()
      .min(20, errorMessages.minLength('Timeline', 20))
      .max(2000, errorMessages.maxLength('Timeline', 2000)),
    teamMembers: z.array(z.string().min(1, 'Team member name is required')).optional(),
    requiredDocuments: z.array(z.string().min(1, 'Document name is required')).optional(),
  }),
  
  milestones: z.object({
    milestones: z.array(z.object({
      title: z.string()
        .min(1, errorMessages.required('Milestone title'))
        .max(255, errorMessages.maxLength('Milestone title', 255)),
      description: z.string()
        .max(1000, errorMessages.maxLength('Description', 1000))
        .optional(),
      milestoneDate: z.date({
        required_error: errorMessages.required('Milestone date'),
        invalid_type_error: 'Please enter a valid date'
      }),
      status: z.enum(['pending', 'in_progress', 'completed'], {
        errorMap: () => ({ message: 'Please select a valid status' })
      }).default('pending'),
    })).min(1, 'At least one milestone is required'),
  }),
  
  review: z.object({
    termsAccepted: z.boolean()
      .refine((val) => val === true, {
        message: 'You must accept the terms and conditions'
      }),
    dataAccuracy: z.boolean()
      .refine((val) => val === true, {
        message: 'You must confirm the data accuracy'
      }),
  }),
  
  complete: z.object({
    title: z.string()
      .min(1, errorMessages.required('Grant title'))
      .max(255, errorMessages.maxLength('Grant title', 255))
      .regex(validationPatterns.alphaNumeric, errorMessages.invalidCharacters('Grant title')),
    organization: z.string()
      .min(1, errorMessages.required('Organization'))
      .max(255, errorMessages.maxLength('Organization', 255))
      .regex(validationPatterns.alphaNumeric, errorMessages.invalidCharacters('Organization')),
    amount: z.number({
      invalid_type_error: 'Amount must be a number'
    }).min(0, 'Amount must be positive').optional(),
    submissionDeadline: z.date({
      required_error: errorMessages.required('Submission deadline'),
      invalid_type_error: 'Please enter a valid date'
    }),
    category: z.enum(['research', 'education', 'community', 'technology', 'healthcare', 'environment', 'arts', 'other'], {
      errorMap: () => ({ message: 'Please select a valid category' })
    }),
    status: z.enum(['draft', 'planning', 'in_progress'], {
      errorMap: () => ({ message: 'Please select a valid status' })
    }).default('draft'),
    description: z.string()
      .min(50, errorMessages.minLength('Description', 50))
      .max(5000, errorMessages.maxLength('Description', 5000)),
    objectives: z.array(z.string().min(1, 'Objective is required'))
      .min(1, 'At least one objective is required'),
    methodology: z.string()
      .min(20, errorMessages.minLength('Methodology', 20))
      .max(2000, errorMessages.maxLength('Methodology', 2000)),
    budget: z.record(z.any()).optional(),
    timeline: z.string()
      .min(20, errorMessages.minLength('Timeline', 20))
      .max(2000, errorMessages.maxLength('Timeline', 2000)),
    teamMembers: z.array(z.object({
      name: z.string().min(1, 'Name is required'),
      role: z.string().min(1, 'Role is required'),
      email: z.string().email('Invalid email address')
    })).optional(),
    requiredDocuments: z.array(z.object({
      name: z.string().min(1, 'Document name is required'),
      type: z.string().min(1, 'Document type is required'),
      required: z.boolean()
    })).optional(),
    milestones: z.array(z.object({
      title: z.string()
        .min(1, errorMessages.required('Milestone title'))
        .max(255, errorMessages.maxLength('Milestone title', 255)),
      description: z.string()
        .max(1000, errorMessages.maxLength('Description', 1000))
        .optional(),
      milestoneDate: z.date({
        required_error: errorMessages.required('Milestone date'),
        invalid_type_error: 'Please enter a valid date'
      }),
      status: z.enum(['pending', 'in_progress', 'completed'], {
        errorMap: () => ({ message: 'Please select a valid status' })
      }).default('pending'),
    })).min(1, 'At least one milestone is required'),
    termsAccepted: z.boolean()
      .refine((val) => val === true, {
        message: 'You must accept the terms and conditions'
      }),
    dataAccuracy: z.boolean()
      .refine((val) => val === true, {
        message: 'You must confirm the data accuracy'
      }),
  })
};

// Content Calendar Form Schema
export const contentCalendarFormSchema = z.object({
  title: z.string()
    .min(1, errorMessages.required('Content title'))
    .max(255, errorMessages.maxLength('Content title', 255)),
  content: z.string()
    .max(10000, errorMessages.maxLength('Content', 10000))
    .optional()
    .or(z.literal('')),
  scheduledDate: z.date({
    required_error: errorMessages.required('Scheduled date'),
    invalid_type_error: 'Please enter a valid date'
  }),
  platform: z.enum(['linkedin', 'twitter', 'facebook', 'instagram', 'email', 'website', 'newsletter', 'press_release', 'other'], {
    errorMap: () => ({ message: 'Please select a valid platform' })
  }).optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'cancelled'], {
    errorMap: () => ({ message: 'Please select a valid content status' })
  }).default('draft'),
  grantId: z.string()
    .regex(validationPatterns.uuid, 'Invalid grant ID')
    .optional(),
});

// Relationship Form Schema
export const relationshipFormSchema = z.object({
  sourceId: z.string()
    .min(1, errorMessages.required('Source ID'))
    .max(255, errorMessages.maxLength('Source ID', 255)),
  targetId: z.string()
    .min(1, errorMessages.required('Target ID'))
    .max(255, errorMessages.maxLength('Target ID', 255)),
  personName: z.string()
    .min(1, errorMessages.required('Person name'))
    .max(255, errorMessages.maxLength('Person name', 255))
    .regex(validationPatterns.personName, errorMessages.invalidCharacters('Person name'))
    .optional(),
  relationshipType: z.enum(['colleague', 'mentor', 'advisor', 'client', 'partner', 'friend', 'family', 'other'], {
    errorMap: () => ({ message: 'Please select a valid relationship type' })
  }).optional(),
  type: z.enum(['professional', 'personal', 'academic', 'business', 'other'], {
    errorMap: () => ({ message: 'Please select a valid relationship category' })
  }).optional(),
  strength: z.number()
    .int('Relationship strength must be a whole number')
    .min(1, errorMessages.minValue('Relationship strength', 1))
    .max(10, errorMessages.maxValue('Relationship strength', 10))
    .default(1),
  verified: z.boolean().default(false),
});

// User Profile Form Schema
export const userProfileFormSchema = z.object({
  firstName: z.string()
    .min(1, errorMessages.required('First name'))
    .max(100, errorMessages.maxLength('First name', 100))
    .regex(validationPatterns.personName, errorMessages.invalidCharacters('First name'))
    .optional(),
  lastName: z.string()
    .min(1, errorMessages.required('Last name'))
    .max(100, errorMessages.maxLength('Last name', 100))
    .regex(validationPatterns.personName, errorMessages.invalidCharacters('Last name'))
    .optional(),
  email: z.string()
    .email(errorMessages.email)
    .min(1, errorMessages.required('Email'))
    .max(255, errorMessages.maxLength('Email', 255)),
  profileImageUrl: z.string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
});

// Tenant Settings Form Schema
export const tenantSettingsFormSchema = z.object({
  name: z.string()
    .min(1, errorMessages.required('Organization name'))
    .max(255, errorMessages.maxLength('Organization name', 255))
    .regex(validationPatterns.alphaNumeric, errorMessages.invalidCharacters('Organization name')),
  domain: z.string()
    .regex(validationPatterns.domain, errorMessages.domain)
    .max(255, errorMessages.maxLength('Domain', 255))
    .optional()
    .or(z.literal('')),
  planTier: z.enum(['basic', 'professional', 'enterprise'], {
    errorMap: () => ({ message: 'Please select a valid plan tier' })
  }).default('basic'),
  microsoft365TenantId: z.string()
    .regex(validationPatterns.uuid, 'Microsoft 365 Tenant ID must be a valid UUID')
    .optional()
    .or(z.literal('')),
  settings: z.object({
    notifications: z.boolean().default(true),
    microsoftIntegration: z.boolean().default(false),
    analyticsEnabled: z.boolean().default(true),
  }).optional(),
});

// Password Reset Form Schema
export const passwordResetFormSchema = z.object({
  email: z.string()
    .min(1, errorMessages.required('Email'))
    .email(errorMessages.email)
    .max(255, errorMessages.maxLength('Email', 255)),
});

// Change Password Form Schema
export const changePasswordFormSchema = z.object({
  currentPassword: z.string()
    .min(1, errorMessages.required('Current password')),
  newPassword: z.string()
    .min(8, errorMessages.minLength('New password', 8))
    .max(100, errorMessages.maxLength('New password', 100))
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, errorMessages.strongPassword),
  confirmPassword: z.string()
    .min(1, errorMessages.required('Confirm password')),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: errorMessages.passwordMatch,
  path: ['confirmPassword'],
});

// Search Form Schema
export const searchFormSchema = z.object({
  query: z.string()
    .min(1, errorMessages.required('Search query'))
    .max(500, errorMessages.maxLength('Search query', 500)),
  type: z.enum(['all', 'sponsors', 'grants', 'relationships', 'content'], {
    errorMap: () => ({ message: 'Please select a valid search type' })
  }).default('all'),
  filters: z.object({
    dateRange: z.object({
      start: z.date().optional(),
      end: z.date().optional(),
    }).optional(),
    status: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

// Export all form data types
export type LoginFormData = z.infer<typeof loginFormSchema>;
export type SponsorFormData = z.infer<typeof sponsorFormSchema>;
export type GrantBasicInfoData = z.infer<typeof grantFormStepSchemas.basicInfo>;
export type GrantDetailsData = z.infer<typeof grantFormStepSchemas.details>;
export type GrantMilestonesData = z.infer<typeof grantFormStepSchemas.milestones>;
export type GrantReviewData = z.infer<typeof grantFormStepSchemas.review>;
export type ContentCalendarFormData = z.infer<typeof contentCalendarFormSchema>;
export type RelationshipFormData = z.infer<typeof relationshipFormSchema>;
export type UserProfileFormData = z.infer<typeof userProfileFormSchema>;
export type TenantSettingsFormData = z.infer<typeof tenantSettingsFormSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetFormSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordFormSchema>;
export type SearchFormData = z.infer<typeof searchFormSchema>;

// Enhanced validation hooks with real-time feedback
export const useAdvancedFieldValidation = (schema?: z.ZodSchema) => {
  const [validationState, setValidationState] = useState({
    isValid: true,
    hasError: false,
    hasWarning: false,
    message: ''
  });

  const validateField = useCallback(async (value: any) => {
    if (!schema) {
      setValidationState({ isValid: true, hasError: false, hasWarning: false, message: '' });
      return { isValid: true, error: null };
    }

    try {
      await schema.parseAsync(value);
      setValidationState({ isValid: true, hasError: false, hasWarning: false, message: 'Valid' });
      return { isValid: true, error: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors[0]?.message || 'Invalid value';
        setValidationState({ isValid: false, hasError: true, hasWarning: false, message });
        return { isValid: false, error: message };
      }
      setValidationState({ isValid: false, hasError: true, hasWarning: false, message: 'Validation failed' });
      return { isValid: false, error: 'Validation failed' };
    }
  }, [schema]);

  return { validateField, validationState };
};

// Validation helper functions
export const validateField = (schema: z.ZodSchema, value: any) => {
  try {
    schema.parse(value);
    return { isValid: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || 'Validation error' };
    }
    return { isValid: false, error: 'Unknown validation error' };
  }
};

export const validateForm = (schema: z.ZodSchema, data: any) => {
  try {
    schema.parse(data);
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: 'Unknown validation error' } };
  }
};

// Removed duplicate - using enhanced version above

export const useFormValidation = (schema: z.ZodSchema) => {
  return (data: any) => validateForm(schema, data);
};