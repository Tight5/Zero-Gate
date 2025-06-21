/**
 * Grant Form Schema Transformation Utilities
 * Bridges legacy milestone structure with enhanced validation schemas
 */

import { subDays } from 'date-fns';

// Legacy milestone structure for backward compatibility
interface LegacyMilestone {
  title: string;
  description: string;
  dueDate: Date;
  type: '90-day' | '60-day' | '30-day' | 'submission' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'critical';
  tasks?: Array<{
    title: string;
    description: string;
    estimatedHours: number;
    assignee?: string;
  }>;
}

// Enhanced validation schema structure
interface ValidatedMilestone {
  title: string;
  description?: string;
  milestoneDate: Date;
  status: 'pending' | 'in_progress' | 'completed';
}

/**
 * Transform legacy milestones to validation schema format
 * Maintains backward compatibility while enabling enhanced validation
 */
export function transformMilestonesToValidationSchema(
  legacyMilestones: LegacyMilestone[]
): ValidatedMilestone[] {
  return legacyMilestones.map(milestone => ({
    title: milestone.title,
    description: milestone.description,
    milestoneDate: milestone.dueDate,
    status: 'pending' as const
  }));
}

/**
 * Generate backward-compatible milestones for Grant Form
 * Creates milestones aligned with attached asset specifications (File 38)
 */
export function generateCompatibleMilestones(submissionDate: Date): LegacyMilestone[] {
  return [
    {
      title: 'Research & Planning Phase',
      description: 'Complete initial research, stakeholder analysis, and project planning',
      dueDate: subDays(submissionDate, 90),
      type: '90-day' as const,
      priority: 'high' as const,
      tasks: [
        { title: 'Literature review', description: 'Comprehensive research review', estimatedHours: 20 },
        { title: 'Stakeholder analysis', description: 'Identify key stakeholders', estimatedHours: 10 },
        { title: 'Project scope definition', description: 'Define project boundaries', estimatedHours: 8 }
      ]
    },
    {
      title: 'Proposal Development',
      description: 'Draft main proposal sections and methodology',
      dueDate: subDays(submissionDate, 60),
      type: '60-day' as const,
      priority: 'high' as const,
      tasks: [
        { title: 'Write methodology section', description: 'Detailed methodology', estimatedHours: 15 },
        { title: 'Develop budget breakdown', description: 'Complete budget analysis', estimatedHours: 12 },
        { title: 'Create project timeline', description: 'Detailed timeline', estimatedHours: 8 }
      ]
    },
    {
      title: 'Final Review & Submission Prep',
      description: 'Complete final review, gather documents, and prepare submission',
      dueDate: subDays(submissionDate, 30),
      type: '30-day' as const,
      priority: 'critical' as const,
      tasks: [
        { title: 'Internal review and revision', description: 'Comprehensive review', estimatedHours: 20 },
        { title: 'Gather supporting documents', description: 'Collect all documents', estimatedHours: 8 },
        { title: 'Format and proofread', description: 'Final formatting', estimatedHours: 12 }
      ]
    },
    {
      title: 'Grant Submission',
      description: 'Submit complete grant application',
      dueDate: submissionDate,
      type: 'submission' as const,
      priority: 'critical' as const,
      tasks: [
        { title: 'Final submission check', description: 'Last verification', estimatedHours: 2 },
        { title: 'Submit application', description: 'Official submission', estimatedHours: 1 },
        { title: 'Confirmation follow-up', description: 'Verify receipt', estimatedHours: 1 }
      ]
    }
  ];
}

/**
 * Validate milestone data for form submission
 * Ensures compatibility with both legacy and enhanced schemas
 */
export function validateMilestoneData(milestones: any[]): ValidatedMilestone[] {
  return milestones.map(milestone => {
    // Handle both legacy and new formats
    if ('dueDate' in milestone) {
      return {
        title: milestone.title,
        description: milestone.description,
        milestoneDate: milestone.dueDate,
        status: 'pending' as const
      };
    }
    
    // Already in new format
    return {
      title: milestone.title,
      description: milestone.description,
      milestoneDate: milestone.milestoneDate,
      status: milestone.status || 'pending'
    };
  });
}