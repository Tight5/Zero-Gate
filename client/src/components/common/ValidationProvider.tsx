/**
 * Validation Provider with Attached Assets Cross-Reference
 * Comprehensive validation system maintaining platform compatibility
 */

import React, { createContext, useContext, useCallback } from 'react';
import { z } from 'zod';
import { 
  validationPatterns, 
  errorMessages,
  validateField,
  validateForm
} from '@/lib/validation';

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  attachedAssetCompliance: number;
}

interface ValidationContextType {
  validateFormData: (schema: z.ZodSchema, data: any, assetReference?: string) => ValidationResult;
  getFieldValidation: (schema: z.ZodSchema, value: any) => { isValid: boolean; error: string | null };
  checkAttachedAssetCompliance: (componentName: string, data: any) => number;
  recordValidationDecision: (decision: string, rationale: string, compliance: number) => void;
}

const ValidationContext = createContext<ValidationContextType | undefined>(undefined);

// Attached Assets Compliance Rules
const ATTACHED_ASSET_RULES = {
  SponsorForm: {
    requiredFields: ['name', 'organization', 'type'],
    validationPatterns: {
      email: validationPatterns.email,
      phone: validationPatterns.phone,
      domain: validationPatterns.domain,
    },
    complianceWeight: 0.95,
    reference: 'File 24: Sponsor Form Implementation'
  },
  LoginForm: {
    requiredFields: ['email', 'password'],
    validationPatterns: {
      email: validationPatterns.email,
    },
    complianceWeight: 0.98,
    reference: 'File 33: Login Page Implementation'
  },
  GrantForm: {
    requiredFields: ['title', 'organization', 'submissionDeadline', 'category'],
    validationPatterns: {
      title: validationPatterns.alphaNumeric,
    },
    complianceWeight: 0.92,
    reference: 'File 38: Grant Management Implementation'
  },
  ContentCalendar: {
    requiredFields: ['title', 'scheduledDate'],
    validationPatterns: {
      title: validationPatterns.alphaNumeric,
    },
    complianceWeight: 0.90,
    reference: 'File 41: Content Calendar Implementation'
  },
  RelationshipForm: {
    requiredFields: ['sourceId', 'targetId'],
    validationPatterns: {
      personName: validationPatterns.personName,
    },
    complianceWeight: 0.94,
    reference: 'File 26-27: Relationship Mapping Implementation'
  }
};

// Decision Log for Validation Deviations
const validationDecisionLog: Array<{
  timestamp: string;
  decision: string;
  rationale: string;
  compliance: number;
  impact: string;
}> = [];

export function ValidationProvider({ children }: { children: React.ReactNode }) {
  const validateFormData = useCallback((
    schema: z.ZodSchema, 
    data: any, 
    assetReference?: string
  ): ValidationResult => {
    const basicValidation = validateForm(schema, data);
    let compliance = 100;
    const warnings: Record<string, string> = {};
    
    // Cross-reference with attached assets if component specified
    if (assetReference && ATTACHED_ASSET_RULES[assetReference as keyof typeof ATTACHED_ASSET_RULES]) {
      const rules = ATTACHED_ASSET_RULES[assetReference as keyof typeof ATTACHED_ASSET_RULES];
      
      // Check required fields compliance
      const missingRequiredFields = rules.requiredFields.filter(field => !data[field]);
      if (missingRequiredFields.length > 0) {
        compliance *= 0.8;
        warnings.requiredFields = `Missing required fields per ${rules.reference}: ${missingRequiredFields.join(', ')}`;
      }
      
      // Check validation pattern compliance
      Object.entries(rules.validationPatterns).forEach(([field, pattern]) => {
        if (data[field] && !pattern.test(data[field])) {
          compliance *= 0.9;
          warnings[field] = `Field validation doesn't match ${rules.reference} specifications`;
        }
      });
      
      compliance *= rules.complianceWeight;
    }
    
    return {
      isValid: basicValidation.isValid,
      errors: basicValidation.errors,
      warnings,
      attachedAssetCompliance: Math.round(compliance)
    };
  }, []);

  const getFieldValidation = useCallback((schema: z.ZodSchema, value: any) => {
    return validateField(schema, value);
  }, []);

  const checkAttachedAssetCompliance = useCallback((componentName: string, data: any): number => {
    const rules = ATTACHED_ASSET_RULES[componentName as keyof typeof ATTACHED_ASSET_RULES];
    if (!rules) return 95; // Default compliance for unknown components
    
    let compliance = 100;
    
    // Check required fields
    const missingFields = rules.requiredFields.filter(field => !data[field] || data[field] === '');
    compliance -= missingFields.length * 10;
    
    // Check pattern compliance
    Object.entries(rules.validationPatterns).forEach(([field, pattern]) => {
      if (data[field] && !pattern.test(data[field])) {
        compliance -= 5;
      }
    });
    
    return Math.max(0, Math.round(compliance * rules.complianceWeight));
  }, []);

  const recordValidationDecision = useCallback((
    decision: string, 
    rationale: string, 
    compliance: number
  ) => {
    validationDecisionLog.push({
      timestamp: new Date().toISOString(),
      decision,
      rationale,
      compliance,
      impact: compliance >= 85 ? 'Low' : compliance >= 70 ? 'Medium' : 'High'
    });
    
    // Log to console for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[ValidationProvider] Decision logged:', {
        decision,
        rationale,
        compliance,
        totalDecisions: validationDecisionLog.length
      });
    }
  }, []);

  const contextValue: ValidationContextType = {
    validateFormData,
    getFieldValidation,
    checkAttachedAssetCompliance,
    recordValidationDecision
  };

  return (
    <ValidationContext.Provider value={contextValue}>
      {children}
    </ValidationContext.Provider>
  );
}

export function useValidation() {
  const context = useContext(ValidationContext);
  if (context === undefined) {
    throw new Error('useValidation must be used within a ValidationProvider');
  }
  return context;
}

// Enhanced validation hook for forms with attached asset compliance
export function useEnhancedFormValidation(componentName: string) {
  const validation = useValidation();
  
  return {
    validateWithCompliance: (schema: z.ZodSchema, data: any) => 
      validation.validateFormData(schema, data, componentName),
    
    checkCompliance: (data: any) => 
      validation.checkAttachedAssetCompliance(componentName, data),
    
    recordDecision: (decision: string, rationale: string, compliance: number) =>
      validation.recordValidationDecision(decision, rationale, compliance)
  };
}

// Export validation decision log for reporting
export function getValidationDecisionLog() {
  return [...validationDecisionLog];
}

// Export compliance summary
export function getComplianceSummary() {
  const decisions = validationDecisionLog;
  if (decisions.length === 0) return { averageCompliance: 100, totalDecisions: 0 };
  
  const averageCompliance = decisions.reduce((sum, d) => sum + d.compliance, 0) / decisions.length;
  
  return {
    averageCompliance: Math.round(averageCompliance),
    totalDecisions: decisions.length,
    highImpactDeviations: decisions.filter(d => d.impact === 'High').length,
    mediumImpactDeviations: decisions.filter(d => d.impact === 'Medium').length,
    lowImpactDeviations: decisions.filter(d => d.impact === 'Low').length
  };
}