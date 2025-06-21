/**
 * Grant Form Wizard Component
 * Multi-step form for creating and editing grants with backwards planning
 * Based on attached asset specifications
 */

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Calendar as CalendarIcon,
  DollarSign,
  FileText,
  Users,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  X
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  grantFormStepSchemas, 
  type GrantBasicInfoData,
  type GrantDetailsData,
  type GrantMilestonesData,
  type GrantReviewData
} from '@/lib/validation';

// Combined form data type from comprehensive validation schemas
type FormData = GrantBasicInfoData & GrantDetailsData & GrantMilestonesData & GrantReviewData;

interface GrantFormProps {
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  onSaveDraft?: (data: Partial<FormData>) => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const FORM_STEPS = [
  { id: 1, title: 'Basic Information', icon: FileText },
  { id: 2, title: 'Grant Details', icon: Users },
  { id: 3, title: 'Milestones & Timeline', icon: Target },
  { id: 4, title: 'Review & Submit', icon: CheckCircle }
];

const GRANT_CATEGORIES = [
  'Research & Development',
  'Education',
  'Healthcare',
  'Technology',
  'Environment',
  'Social Impact',
  'Arts & Culture',
  'Infrastructure',
  'Other'
];

export const GrantForm: React.FC<GrantFormProps> = ({
  initialData,
  onSubmit,
  onSaveDraft,
  isLoading = false,
  mode = 'create'
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<FormData>>(initialData || {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const form = useForm<FormData>({
    defaultValues: formData,
    mode: 'onChange'
  });

  const { control, handleSubmit, watch, setValue, trigger, formState } = form;
  const watchedValues = watch();

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (onSaveDraft && mode === 'create') {
      const interval = setInterval(() => {
        const currentData = { ...formData, ...watchedValues };
        onSaveDraft(currentData);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [formData, watchedValues, onSaveDraft, mode]);

  // Generate automatic milestones based on submission deadline
  const generateAutoMilestones = (submissionDate: Date) => {
    const milestones = [
      {
        title: 'Initial Research & Planning',
        description: 'Complete background research and develop project plan',
        dueDate: subDays(submissionDate, 90),
        type: '90-day' as const,
        priority: 'high' as const,
        tasks: [
          { title: 'Literature review', description: '', estimatedHours: 20 },
          { title: 'Stakeholder analysis', description: '', estimatedHours: 10 },
          { title: 'Project scope definition', description: '', estimatedHours: 8 }
        ]
      },
      {
        title: 'Proposal Development',
        description: 'Draft main proposal sections and methodology',
        dueDate: subDays(submissionDate, 60),
        type: '60-day' as const,
        priority: 'high' as const,
        tasks: [
          { title: 'Write methodology section', description: '', estimatedHours: 15 },
          { title: 'Develop budget breakdown', description: '', estimatedHours: 12 },
          { title: 'Create project timeline', description: '', estimatedHours: 8 }
        ]
      },
      {
        title: 'Final Review & Submission Prep',
        description: 'Complete final review, gather documents, and prepare submission',
        dueDate: subDays(submissionDate, 30),
        type: '30-day' as const,
        priority: 'critical' as const,
        tasks: [
          { title: 'Internal review and revision', description: '', estimatedHours: 20 },
          { title: 'Gather supporting documents', description: '', estimatedHours: 8 },
          { title: 'Format and proofread', description: '', estimatedHours: 12 }
        ]
      },
      {
        title: 'Grant Submission',
        description: 'Submit complete grant application',
        dueDate: submissionDate,
        type: 'submission' as const,
        priority: 'critical' as const,
        tasks: [
          { title: 'Final submission check', description: '', estimatedHours: 2 },
          { title: 'Submit application', description: '', estimatedHours: 1 },
          { title: 'Confirmation follow-up', description: '', estimatedHours: 1 }
        ]
      }
    ];
    
    setValue('milestones', milestones);
  };

  const validateCurrentStep = async () => {
    let schema;
    let dataToValidate;
    
    switch (currentStep) {
      case 1:
        schema = basicInfoSchema;
        dataToValidate = {
          title: watchedValues.title,
          organization: watchedValues.organization,
          amount: watchedValues.amount,
          submissionDeadline: watchedValues.submissionDeadline,
          category: watchedValues.category,
          status: watchedValues.status || 'draft'
        };
        break;
      case 2:
        schema = detailsSchema;
        dataToValidate = {
          description: watchedValues.description,
          objectives: watchedValues.objectives,
          methodology: watchedValues.methodology,
          budget: watchedValues.budget,
          timeline: watchedValues.timeline,
          teamMembers: watchedValues.teamMembers,
          requiredDocuments: watchedValues.requiredDocuments
        };
        break;
      case 3:
        schema = milestonesSchema;
        dataToValidate = {
          milestones: watchedValues.milestones || []
        };
        break;
      case 4:
        schema = reviewSchema;
        dataToValidate = {
          termsAccepted: watchedValues.termsAccepted,
          dataAccuracy: watchedValues.dataAccuracy
        };
        break;
      default:
        return true;
    }
    
    try {
      schema.parse(dataToValidate);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path) {
            newErrors[err.path.join('.')] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
      setErrors({});
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleFormSubmit = (data: FormData) => {
    onSubmit(data);
  };

  const progress = (currentStep / FORM_STEPS.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold">
                {mode === 'create' ? 'Create New Grant' : 'Edit Grant'}
              </h1>
              <p className="text-gray-600">
                Step {currentStep} of {FORM_STEPS.length}: {FORM_STEPS[currentStep - 1].title}
              </p>
            </div>
            <Badge variant="outline">
              {Math.round(progress)}% Complete
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
          
          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {FORM_STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2",
                    isActive ? "bg-blue-500 border-blue-500 text-white" :
                    isCompleted ? "bg-green-500 border-green-500 text-white" :
                    "bg-gray-100 border-gray-300 text-gray-500"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={cn(
                    "text-xs mt-1 text-center",
                    isActive ? "text-blue-600 font-medium" :
                    isCompleted ? "text-green-600" :
                    "text-gray-500"
                  )}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </CardHeader>
      </Card>

      {/* Form Steps */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Grant Title *</Label>
                  <Controller
                    name="title"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="Enter grant title"
                        className={errors.title ? 'border-red-500' : ''}
                      />
                    )}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500 mt-1">{errors.title}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="organization">Organization *</Label>
                  <Controller
                    name="organization"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="Grant organization"
                        className={errors.organization ? 'border-red-500' : ''}
                      />
                    )}
                  />
                  {errors.organization && (
                    <p className="text-sm text-red-500 mt-1">{errors.organization}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="amount">Grant Amount ($) *</Label>
                  <Controller
                    name="amount"
                    control={control}
                    render={({ field }) => (
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="number"
                          placeholder="0"
                          className={`pl-10 ${errors.amount ? 'border-red-500' : ''}`}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </div>
                    )}
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRANT_CATEGORIES.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.category && (
                    <p className="text-sm text-red-500 mt-1">{errors.category}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="submissionDeadline">Submission Deadline *</Label>
                  <Controller
                    name="submissionDeadline"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                              errors.submissionDeadline ? 'border-red-500' : ''
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              if (date) {
                                generateAutoMilestones(date);
                              }
                            }}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.submissionDeadline && (
                    <p className="text-sm text-red-500 mt-1">{errors.submissionDeadline}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Grant Details */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Grant Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">Project Description *</Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      placeholder="Provide a detailed description of your project..."
                      rows={4}
                      className={errors.description ? 'border-red-500' : ''}
                    />
                  )}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="objectives">Project Objectives *</Label>
                <Controller
                  name="objectives"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      placeholder="List the main objectives and expected outcomes..."
                      rows={3}
                      className={errors.objectives ? 'border-red-500' : ''}
                    />
                  )}
                />
                {errors.objectives && (
                  <p className="text-sm text-red-500 mt-1">{errors.objectives}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="methodology">Methodology *</Label>
                <Controller
                  name="methodology"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      placeholder="Describe your approach and methodology..."
                      rows={3}
                      className={errors.methodology ? 'border-red-500' : ''}
                    />
                  )}
                />
                {errors.methodology && (
                  <p className="text-sm text-red-500 mt-1">{errors.methodology}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budget">Budget Breakdown *</Label>
                  <Controller
                    name="budget"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="Personnel: $XX,XXX&#10;Equipment: $XX,XXX&#10;Materials: $XX,XXX"
                        rows={4}
                        className={errors.budget ? 'border-red-500' : ''}
                      />
                    )}
                  />
                  {errors.budget && (
                    <p className="text-sm text-red-500 mt-1">{errors.budget}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="timeline">Project Timeline *</Label>
                  <Controller
                    name="timeline"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="Month 1-3: Initial research&#10;Month 4-6: Development&#10;Month 7-12: Implementation"
                        rows={4}
                        className={errors.timeline ? 'border-red-500' : ''}
                      />
                    )}
                  />
                  {errors.timeline && (
                    <p className="text-sm text-red-500 mt-1">{errors.timeline}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Milestones & Timeline */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Milestones & Timeline
              </CardTitle>
              <p className="text-sm text-gray-600">
                Auto-generated milestones based on your submission deadline. You can modify as needed.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {watchedValues.milestones?.map((milestone, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{milestone.title}</h3>
                        <p className="text-sm text-gray-600">{milestone.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{milestone.type}</Badge>
                        <Badge variant={
                          milestone.priority === 'critical' ? 'destructive' :
                          milestone.priority === 'high' ? 'destructive' :
                          milestone.priority === 'medium' ? 'default' : 'secondary'
                        }>
                          {milestone.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 mb-3">
                      Due: {format(milestone.dueDate, 'PPP')}
                    </div>
                    {milestone.tasks && milestone.tasks.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Tasks ({milestone.tasks.length})</h4>
                        <div className="space-y-1">
                          {milestone.tasks.map((task, taskIndex) => (
                            <div key={taskIndex} className="text-sm text-gray-600 pl-4">
                              • {task.title} ({task.estimatedHours}h)
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review & Submit */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Review & Submit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Grant Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Title:</strong> {watchedValues.title}</div>
                    <div><strong>Organization:</strong> {watchedValues.organization}</div>
                    <div><strong>Amount:</strong> ${watchedValues.amount?.toLocaleString()}</div>
                    <div><strong>Category:</strong> {watchedValues.category}</div>
                    <div><strong>Deadline:</strong> {watchedValues.submissionDeadline ? format(watchedValues.submissionDeadline, 'PPP') : 'Not set'}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Milestones</h3>
                  <div className="space-y-1 text-sm">
                    {watchedValues.milestones?.map((milestone, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{milestone.title}</span>
                        <span className="text-gray-500">{format(milestone.dueDate, 'MMM dd')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Confirmation Checkboxes */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-start space-x-2">
                  <Controller
                    name="dataAccuracy"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <div className="text-sm">
                    <Label>I confirm that all information provided is accurate and complete</Label>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Controller
                    name="termsAccepted"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <div className="text-sm">
                    <Label>I agree to the terms and conditions</Label>
                  </div>
                </div>
                
                {(errors.dataAccuracy || errors.termsAccepted) && (
                  <div className="text-sm text-red-500">
                    Please confirm all required items above
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            {onSaveDraft && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onSaveDraft({ ...formData, ...watchedValues })}
                disabled={isLoading}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
            )}
            
            {currentStep < 4 ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit Grant'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default GrantForm;