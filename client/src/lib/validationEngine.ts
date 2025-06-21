/**
 * Advanced Validation Engine
 * Enterprise-grade validation system with attached asset cross-referencing
 * Implements real-time validation, field dependencies, and business logic validation
 */

import { z } from 'zod';
import { 
  validationPatterns, 
  errorMessages,
  loginFormSchema,
  sponsorFormSchema,
  grantFormStepSchemas,
  contentCalendarFormSchema,
  relationshipFormSchema
} from './validation';

export interface ValidationRule {
  field: string;
  validator: (value: any, formData?: any) => ValidationResult;
  dependencies?: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  attachedAssetRef?: string;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  type: 'error' | 'warning' | 'info' | 'success';
  code?: string;
  suggestions?: string[];
}

export interface FormValidationState {
  isValid: boolean;
  errors: Record<string, ValidationResult>;
  warnings: Record<string, ValidationResult>;
  fieldStates: Record<string, FieldValidationState>;
  overallScore: number;
  completionPercentage: number;
  estimatedTimeToCompletion?: string;
}

export interface FieldValidationState {
  isValid: boolean;
  isRequired: boolean;
  hasBeenTouched: boolean;
  hasValue: boolean;
  validationScore: number;
  lastValidated: Date;
  result?: ValidationResult;
}

class ValidationEngine {
  private rules: Map<string, ValidationRule[]> = new Map();
  private schemas: Map<string, z.ZodSchema> = new Map();
  private formStates: Map<string, FormValidationState> = new Map();
  
  constructor() {
    this.initializeSchemas();
    this.initializeBusinessRules();
  }

  private initializeSchemas() {
    // Register all validation schemas with attached asset references
    this.schemas.set('login', loginFormSchema);
    this.schemas.set('sponsor', sponsorFormSchema);
    this.schemas.set('grant-basic', grantFormStepSchemas.basicInfo);
    this.schemas.set('grant-details', grantFormStepSchemas.details);
    this.schemas.set('grant-milestones', grantFormStepSchemas.milestones);
    this.schemas.set('grant-review', grantFormStepSchemas.review);
    this.schemas.set('grant-complete', grantFormStepSchemas.complete);
    this.schemas.set('content-calendar', contentCalendarFormSchema);
    this.schemas.set('relationship', relationshipFormSchema);
  }

  private initializeBusinessRules() {
    // Sponsor form business rules (File 24 compliance)
    this.addBusinessRule('sponsor', {
      field: 'organization',
      validator: (value: string) => this.validateOrganizationName(value),
      priority: 'critical',
      attachedAssetRef: 'File 24 - Sponsor Form'
    });

    this.addBusinessRule('sponsor', {
      field: 'email',
      validator: (value: string) => this.validateBusinessEmail(value),
      priority: 'high',
      attachedAssetRef: 'File 24 - Sponsor Form'
    });

    this.addBusinessRule('sponsor', {
      field: 'fundingRange',
      validator: (value: string, formData: any) => this.validateFundingConsistency(value, formData),
      dependencies: ['previousFunding', 'organizationType'],
      priority: 'medium',
      attachedAssetRef: 'File 24 - Sponsor Form'
    });

    // Grant form business rules (File 38 compliance)
    this.addBusinessRule('grant-basic', {
      field: 'submissionDeadline',
      validator: (value: Date) => this.validateSubmissionDeadline(value),
      priority: 'critical',
      attachedAssetRef: 'File 38 - Grant Management'
    });

    this.addBusinessRule('grant-details', {
      field: 'budget',
      validator: (value: any, formData: any) => this.validateBudgetAlignment(value, formData),
      dependencies: ['amount'],
      priority: 'high',
      attachedAssetRef: 'File 38 - Grant Management'
    });

    this.addBusinessRule('grant-milestones', {
      field: 'milestones',
      validator: (value: any[]) => this.validateMilestoneSequence(value),
      priority: 'high',
      attachedAssetRef: 'File 38 - Grant Management'
    });

    // Login form security rules (File 33 compliance)
    this.addBusinessRule('login', {
      field: 'password',
      validator: (value: string) => this.validatePasswordStrength(value),
      priority: 'critical',
      attachedAssetRef: 'File 33 - Login Page'
    });

    // Content calendar rules
    this.addBusinessRule('content-calendar', {
      field: 'scheduledDate',
      validator: (value: Date, formData: any) => this.validateContentScheduling(value, formData),
      dependencies: ['contentType', 'channel'],
      priority: 'medium',
      attachedAssetRef: 'File 41 - Content Calendar'
    });
  }

  public addBusinessRule(formType: string, rule: ValidationRule): void {
    if (!this.rules.has(formType)) {
      this.rules.set(formType, []);
    }
    this.rules.get(formType)?.push(rule);
  }

  public async validateForm(
    formType: string, 
    formData: any, 
    options: { skipBusinessRules?: boolean } = {}
  ): Promise<FormValidationState> {
    const schema = this.schemas.get(formType);
    const businessRules = this.rules.get(formType) || [];
    
    const state: FormValidationState = {
      isValid: true,
      errors: {},
      warnings: {},
      fieldStates: {},
      overallScore: 0,
      completionPercentage: 0
    };

    // Schema validation
    if (schema) {
      try {
        await schema.parseAsync(formData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            const fieldPath = err.path.join('.');
            state.errors[fieldPath] = {
              isValid: false,
              message: err.message,
              type: 'error',
              code: err.code
            };
            state.isValid = false;
          });
        }
      }
    }

    // Business rules validation
    if (!options.skipBusinessRules) {
      for (const rule of businessRules) {
        const fieldValue = this.getFieldValue(formData, rule.field);
        const result = rule.validator(fieldValue, formData);
        
        if (!result.isValid) {
          if (result.type === 'error') {
            state.errors[rule.field] = result;
            state.isValid = false;
          } else if (result.type === 'warning') {
            state.warnings[rule.field] = result;
          }
        }

        // Update field state
        state.fieldStates[rule.field] = {
          isValid: result.isValid,
          isRequired: rule.priority === 'critical',
          hasBeenTouched: true,
          hasValue: fieldValue != null && fieldValue !== '',
          validationScore: result.isValid ? 100 : 0,
          lastValidated: new Date(),
          result
        };
      }
    }

    // Calculate overall metrics
    this.calculateFormMetrics(state, formData);
    
    // Store state
    this.formStates.set(formType, state);
    
    return state;
  }

  public async validateField(
    formType: string,
    fieldName: string,
    value: any,
    formData?: any
  ): Promise<ValidationResult> {
    const schema = this.schemas.get(formType);
    const businessRules = this.rules.get(formType) || [];
    
    // Schema validation for field
    if (schema && schema.shape && schema.shape[fieldName]) {
      try {
        await schema.shape[fieldName].parseAsync(value);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            isValid: false,
            message: error.errors[0]?.message || 'Validation failed',
            type: 'error',
            code: error.errors[0]?.code
          };
        }
      }
    }

    // Business rule validation for field
    const fieldRule = businessRules.find(rule => rule.field === fieldName);
    if (fieldRule) {
      return fieldRule.validator(value, formData);
    }

    return {
      isValid: true,
      type: 'success'
    };
  }

  // Business validation methods with attached asset compliance

  private validateOrganizationName(value: string): ValidationResult {
    if (!value || value.length < 2) {
      return {
        isValid: false,
        message: 'Organization name must be at least 2 characters',
        type: 'error',
        suggestions: ['Enter the full organization name', 'Check for typos']
      };
    }

    if (!validationPatterns.alphaNumeric.test(value)) {
      return {
        isValid: false,
        message: 'Organization name contains invalid characters',
        type: 'error',
        suggestions: ['Use only letters, numbers, spaces, and common punctuation']
      };
    }

    if (value.length < 3) {
      return {
        isValid: true,
        message: 'Consider using the full organization name for better identification',
        type: 'warning'
      };
    }

    return { isValid: true, type: 'success' };
  }

  private validateBusinessEmail(value: string): ValidationResult {
    if (!validationPatterns.email.test(value)) {
      return {
        isValid: false,
        message: 'Please enter a valid email address',
        type: 'error'
      };
    }

    // Check for common personal email domains
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const domain = value.split('@')[1]?.toLowerCase();
    
    if (personalDomains.includes(domain)) {
      return {
        isValid: true,
        message: 'Consider using a business email address for professional correspondence',
        type: 'warning'
      };
    }

    return { isValid: true, type: 'success' };
  }

  private validateFundingConsistency(value: string, formData: any): ValidationResult {
    const fundingAmount = parseInt(value.replace(/[^\d]/g, ''));
    const previousFunding = formData?.previousFunding;
    const organizationType = formData?.organizationType;

    if (organizationType === 'startup' && fundingAmount > 10000000) {
      return {
        isValid: true,
        message: 'High funding amount for startup - verify accuracy',
        type: 'warning'
      };
    }

    if (previousFunding && fundingAmount < previousFunding * 0.5) {
      return {
        isValid: true,
        message: 'Current funding significantly lower than previous rounds',
        type: 'warning'
      };
    }

    return { isValid: true, type: 'success' };
  }

  private validateSubmissionDeadline(value: Date): ValidationResult {
    const now = new Date();
    const deadline = new Date(value);
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (deadline <= now) {
      return {
        isValid: false,
        message: 'Submission deadline must be in the future',
        type: 'error'
      };
    }

    if (daysUntilDeadline < 30) {
      return {
        isValid: true,
        message: 'Less than 30 days until deadline - ensure adequate preparation time',
        type: 'warning'
      };
    }

    if (daysUntilDeadline > 365) {
      return {
        isValid: true,
        message: 'Deadline is over a year away - verify accuracy',
        type: 'warning'
      };
    }

    return { isValid: true, type: 'success' };
  }

  private validateBudgetAlignment(budget: any, formData: any): ValidationResult {
    const requestedAmount = formData?.amount || 0;
    
    if (typeof budget === 'object' && budget !== null) {
      const totalBudget = Object.values(budget).reduce((sum: number, val: any) => {
        return sum + (typeof val === 'number' ? val : 0);
      }, 0);

      if (totalBudget > requestedAmount * 1.1) {
        return {
          isValid: false,
          message: 'Budget breakdown exceeds requested amount',
          type: 'error'
        };
      }

      if (totalBudget < requestedAmount * 0.8) {
        return {
          isValid: true,
          message: 'Budget breakdown is significantly less than requested amount',
          type: 'warning'
        };
      }
    }

    return { isValid: true, type: 'success' };
  }

  private validateMilestoneSequence(milestones: any[]): ValidationResult {
    if (!Array.isArray(milestones) || milestones.length === 0) {
      return {
        isValid: false,
        message: 'At least one milestone is required',
        type: 'error'
      };
    }

    // Check for proper chronological order
    for (let i = 1; i < milestones.length; i++) {
      const prevDate = new Date(milestones[i - 1].milestoneDate);
      const currentDate = new Date(milestones[i].milestoneDate);
      
      if (currentDate <= prevDate) {
        return {
          isValid: false,
          message: 'Milestones must be in chronological order',
          type: 'error'
        };
      }
    }

    return { isValid: true, type: 'success' };
  }

  private validatePasswordStrength(value: string): ValidationResult {
    if (value.length < 8) {
      return {
        isValid: false,
        message: 'Password must be at least 8 characters long',
        type: 'error'
      };
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    const strengthScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

    if (strengthScore < 3) {
      return {
        isValid: true,
        message: 'Password could be stronger - consider adding uppercase, lowercase, numbers, and special characters',
        type: 'warning'
      };
    }

    return { isValid: true, type: 'success' };
  }

  private validateContentScheduling(scheduledDate: Date, formData: any): ValidationResult {
    const now = new Date();
    const scheduled = new Date(scheduledDate);
    const contentType = formData?.contentType;
    const channel = formData?.channel;

    if (scheduled <= now) {
      return {
        isValid: false,
        message: 'Scheduled date must be in the future',
        type: 'error'
      };
    }

    // Business hours validation for certain content types
    if (contentType === 'announcement' && channel === 'email') {
      const hour = scheduled.getHours();
      if (hour < 9 || hour > 17) {
        return {
          isValid: true,
          message: 'Consider scheduling announcements during business hours for better engagement',
          type: 'warning'
        };
      }
    }

    return { isValid: true, type: 'success' };
  }

  private getFieldValue(formData: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((obj, key) => obj?.[key], formData);
  }

  private calculateFormMetrics(state: FormValidationState, formData: any): void {
    const totalFields = Object.keys(formData).length;
    const completedFields = Object.values(formData).filter(value => 
      value !== null && value !== undefined && value !== ''
    ).length;

    state.completionPercentage = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;

    // Calculate overall score based on validation results
    const totalValidationResults = Object.keys(state.fieldStates).length;
    const validFields = Object.values(state.fieldStates).filter(field => field.isValid).length;
    
    state.overallScore = totalValidationResults > 0 ? (validFields / totalValidationResults) * 100 : 0;

    // Estimate time to completion
    const remainingFields = totalFields - completedFields;
    const avgTimePerField = 30; // seconds
    const estimatedSeconds = remainingFields * avgTimePerField;
    
    if (estimatedSeconds > 0) {
      const minutes = Math.ceil(estimatedSeconds / 60);
      state.estimatedTimeToCompletion = `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }

  public getFormState(formType: string): FormValidationState | undefined {
    return this.formStates.get(formType);
  }

  public clearFormState(formType: string): void {
    this.formStates.delete(formType);
  }
}

// Export singleton instance
export const validationEngine = new ValidationEngine();

// Export utility functions
export const validateFormAsync = (formType: string, formData: any) => 
  validationEngine.validateForm(formType, formData);

export const validateFieldAsync = (formType: string, fieldName: string, value: any, formData?: any) =>
  validationEngine.validateField(formType, fieldName, value, formData);

export const getFormValidationState = (formType: string) =>
  validationEngine.getFormState(formType);