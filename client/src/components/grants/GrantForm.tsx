/**
 * Grant Form Wizard Component
 * TypeScript-safe implementation with validation schema compliance
 * Aligned with attached asset specifications (File 38)
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  FileText, 
  Target,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  grantFormStepSchemas, 
  type GrantBasicInfoData,
  type GrantDetailsData,
  type GrantMilestonesData,
  type GrantReviewData
} from '@/lib/validation';

type FormData = GrantBasicInfoData & GrantDetailsData & GrantMilestonesData & GrantReviewData;

interface GrantFormProps {
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  onSaveDraft?: (data: Partial<FormData>) => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

export const GrantForm: React.FC<GrantFormProps> = ({
  initialData,
  onSubmit,
  onSaveDraft,
  isLoading = false,
  mode = 'create'
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isValidating, setIsValidating] = useState(false);
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({});

  const form = useForm<FormData>({
    resolver: zodResolver(grantFormStepSchemas.complete),
    defaultValues: {
      title: '',
      organization: '',
      amount: 0,
      submissionDeadline: new Date(),
      category: 'technology',
      status: 'draft',
      description: '',
      objectives: '',
      methodology: '',
      budget: '',
      timeline: '',
      teamMembers: [],
      requiredDocuments: [],
      milestones: [],
      termsAccepted: false,
      dataAccuracy: false,
      ...initialData
    },
    mode: 'onChange'
  });

  const { watch, setValue } = form;
  const watchedValues = watch();

  // Generate auto-milestones when submission deadline changes
  useEffect(() => {
    if (watchedValues.submissionDeadline && (!watchedValues.milestones || watchedValues.milestones.length === 0)) {
      generateAutoMilestones(new Date(watchedValues.submissionDeadline));
    }
  }, [watchedValues.submissionDeadline]);

  const generateAutoMilestones = (submissionDate: Date) => {
    const milestones = [
      {
        title: 'Research & Planning Phase',
        description: 'Complete initial research, stakeholder analysis, and project planning',
        milestoneDate: subDays(submissionDate, 90),
        status: 'pending' as const
      },
      {
        title: 'Proposal Development',
        description: 'Draft main proposal sections and methodology',
        milestoneDate: subDays(submissionDate, 60),
        status: 'pending' as const
      },
      {
        title: 'Final Review & Submission Prep',
        description: 'Complete final review, gather documents, and prepare submission',
        milestoneDate: subDays(submissionDate, 30),
        status: 'pending' as const
      },
      {
        title: 'Grant Submission',
        description: 'Submit complete grant application',
        milestoneDate: submissionDate,
        status: 'pending' as const
      }
    ];
    
    setValue('milestones', milestones);
  };

  const validateCurrentStep = async () => {
    let schema;
    let dataToValidate;
    
    switch (currentStep) {
      case 1:
        schema = grantFormStepSchemas.basicInfo;
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
        schema = grantFormStepSchemas.details;
        dataToValidate = {
          description: watchedValues.description,
          objectives: watchedValues.objectives?.[0] || '',
          methodology: watchedValues.methodology,
          budget: watchedValues.budget,
          timeline: watchedValues.timeline,
          teamMembers: watchedValues.teamMembers,
          requiredDocuments: watchedValues.requiredDocuments
        };
        break;
      case 3:
        schema = grantFormStepSchemas.milestones;
        dataToValidate = {
          milestones: watchedValues.milestones || []
        };
        break;
      case 4:
        schema = grantFormStepSchemas.review;
        dataToValidate = {
          termsAccepted: watchedValues.termsAccepted,
          dataAccuracy: watchedValues.dataAccuracy
        };
        break;
      default:
        return true;
    }
    
    try {
      setIsValidating(true);
      await schema.parseAsync(dataToValidate);
      setStepValidation(prev => ({ ...prev, [currentStep]: true }));
      return true;
    } catch (error) {
      setStepValidation(prev => ({ ...prev, [currentStep]: false }));
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const nextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFormSubmit = (data: FormData) => {
    onSubmit(data);
  };

  const addObjective = () => {
    const objectives = form.getValues('objectives') || [];
    form.setValue('objectives', [...objectives, '']);
  };

  const removeObjective = (index: number) => {
    const objectives = form.getValues('objectives') || [];
    form.setValue('objectives', objectives.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {mode === 'edit' ? 'Edit Grant Application' : 'New Grant Application'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Complete all steps to submit your grant application
          </p>
        </div>
        {onSaveDraft && (
          <Button variant="outline" onClick={() => onSaveDraft(form.getValues())}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
        )}
      </div>

      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Application Progress</span>
            <Badge variant="outline">{currentStep}/4</Badge>
          </CardTitle>
          <Progress value={(currentStep / 4) * 100} className="w-full" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            {[
              { step: 1, title: 'Basic Info', icon: FileText },
              { step: 2, title: 'Details', icon: Target },
              { step: 3, title: 'Milestones', icon: Clock },
              { step: 4, title: 'Review', icon: CheckCircle }
            ].map(({ step, title, icon: Icon }) => (
              <div key={step} className="flex flex-col items-center space-y-2">
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2",
                  step === currentStep ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" :
                  stepValidation[step] ? "border-green-500 bg-green-50 dark:bg-green-900/20" :
                  "border-gray-300 bg-white dark:bg-gray-800"
                )}>
                  {stepValidation[step] ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Icon className={cn(
                      "w-5 h-5",
                      step === currentStep ? "text-blue-500" : "text-gray-400"
                    )} />
                  )}
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  step === currentStep ? "text-blue-600 dark:text-blue-400" :
                  stepValidation[step] ? "text-green-600 dark:text-green-400" :
                  "text-gray-500 dark:text-gray-400"
                )}>
                  {title}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Basic Information</span>
                </CardTitle>
                <CardDescription>
                  Enter the fundamental details of your grant application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grant Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter grant title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter organization name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grant Amount *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input 
                              type="number" 
                              placeholder="0" 
                              className="pl-10"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="technology">Technology</SelectItem>
                            <SelectItem value="research">Research</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                            <SelectItem value="healthcare">Healthcare</SelectItem>
                            <SelectItem value="environment">Environment</SelectItem>
                            <SelectItem value="arts">Arts & Culture</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="submissionDeadline"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Submission Deadline *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Details */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Project Details</span>
                </CardTitle>
                <CardDescription>
                  Provide detailed information about your project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your project in detail..."
                          className="min-h-32"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Project Objectives</FormLabel>
                  <FormDescription className="mb-3">
                    Add specific, measurable objectives for your project
                  </FormDescription>
                  {(form.getValues('objectives') || []).map((_, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <FormField
                        control={form.control}
                        name={`objectives.${index}`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder={`Objective ${index + 1}`} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeObjective(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addObjective}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Objective
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name="methodology"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Methodology</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your approach and methodology..."
                          className="min-h-24"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Timeline</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Outline your project timeline..."
                          className="min-h-20"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Milestones */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Project Milestones</span>
                </CardTitle>
                <CardDescription>
                  Review and customize your project milestones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {watchedValues.submissionDeadline && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Milestones are automatically generated based on your submission deadline of{' '}
                      <strong>{format(new Date(watchedValues.submissionDeadline), 'PPP')}</strong>
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generateAutoMilestones(new Date(watchedValues.submissionDeadline))}
                      className="mt-2"
                    >
                      Regenerate Milestones
                    </Button>
                  </div>
                )}

                <div className="space-y-4">
                  {(watchedValues.milestones || []).map((milestone, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {milestone.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {milestone.description}
                          </p>
                          <div className="flex items-center mt-2 space-x-4">
                            <Badge variant="outline">
                              Due: {format(new Date(milestone.milestoneDate), 'PPP')}
                            </Badge>
                            <Badge variant={
                              milestone.status === 'completed' ? 'default' :
                              milestone.status === 'in_progress' ? 'secondary' : 'outline'
                            }>
                              {milestone.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Review & Submit</span>
                </CardTitle>
                <CardDescription>
                  Review your application and confirm submission
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Application Summary */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Application Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Title:</span> {watchedValues.title}
                    </div>
                    <div>
                      <span className="font-medium">Organization:</span> {watchedValues.organization}
                    </div>
                    <div>
                      <span className="font-medium">Amount:</span> ${watchedValues.amount?.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Category:</span> {watchedValues.category}
                    </div>
                    <div>
                      <span className="font-medium">Deadline:</span>{' '}
                      {watchedValues.submissionDeadline ? format(new Date(watchedValues.submissionDeadline), 'PPP') : 'Not set'}
                    </div>
                    <div>
                      <span className="font-medium">Milestones:</span> {watchedValues.milestones?.length || 0}
                    </div>
                  </div>
                </div>

                {/* Confirmation Checkboxes */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I accept the terms and conditions *
                          </FormLabel>
                          <FormDescription>
                            By checking this box, you agree to the grant application terms and conditions.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dataAccuracy"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I confirm the accuracy of all provided information *
                          </FormLabel>
                          <FormDescription>
                            All information provided in this application is accurate and complete to the best of my knowledge.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex space-x-2">
              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={isValidating}
                >
                  {isValidating ? 'Validating...' : 'Next'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading || !watchedValues.termsAccepted || !watchedValues.dataAccuracy}
                >
                  {isLoading ? 'Submitting...' : 'Submit Application'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};