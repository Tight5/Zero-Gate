/**
 * Grant Details View Component
 * Comprehensive grant information display with timeline and task management
 * Based on attached asset specifications
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Edit, 
  Calendar, 
  DollarSign, 
  Users, 
  Target, 
  FileText, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  Share,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { format, differenceInDays, isBefore } from 'date-fns';
import GrantTimeline from './GrantTimeline';

interface GrantDetailsProps {
  grant: {
    id: string;
    title: string;
    organization: string;
    amount: number;
    submissionDeadline: Date;
    status: 'draft' | 'submitted' | 'under-review' | 'awarded' | 'rejected';
    category: string;
    description: string;
    objectives: string;
    methodology: string;
    budget: string;
    timeline: string;
    teamMembers?: string[];
    requiredDocuments?: string[];
    createdAt: Date;
    updatedAt: Date;
    submittedAt?: Date;
    milestones: Array<{
      id: string;
      title: string;
      description: string;
      dueDate: Date;
      completedDate?: Date;
      status: 'pending' | 'in-progress' | 'completed' | 'overdue';
      type: '90-day' | '60-day' | '30-day' | 'submission' | 'custom';
      priority: 'low' | 'medium' | 'high' | 'critical';
      tasks: Array<{
        id: string;
        title: string;
        description: string;
        completed: boolean;
        assignee?: string;
        dueDate: Date;
        estimatedHours: number;
        actualHours?: number;
      }>;
      dependencies: string[];
    }>;
    attachments?: Array<{
      id: string;
      name: string;
      type: string;
      size: number;
      uploadedAt: Date;
    }>;
    notes?: Array<{
      id: string;
      content: string;
      author: string;
      createdAt: Date;
    }>;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdateMilestone?: (milestoneId: string, updates: any) => void;
  onUpdateTask?: (milestoneId: string, taskId: string, updates: any) => void;
  readonly?: boolean;
}

export const GrantDetails: React.FC<GrantDetailsProps> = ({
  grant,
  onEdit,
  onDelete,
  onUpdateMilestone,
  onUpdateTask,
  readonly = false
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate grant metrics
  const daysToDeadline = differenceInDays(grant.submissionDeadline, new Date());
  const totalMilestones = grant.milestones.length;
  const completedMilestones = grant.milestones.filter(m => m.status === 'completed').length;
  const overdueMilestones = grant.milestones.filter(m => 
    m.status !== 'completed' && isBefore(m.dueDate, new Date())
  ).length;
  const progressPercentage = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'awarded':
        return 'default';
      case 'submitted':
        return 'secondary';
      case 'under-review':
        return 'outline';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'awarded':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'submitted':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'under-review':
        return <FileText className="w-4 h-4 text-orange-500" />;
      case 'rejected':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Edit className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon(grant.status)}
            <h1 className="text-3xl font-bold">{grant.title}</h1>
            <Badge variant={getStatusBadgeVariant(grant.status)}>
              {grant.status.replace('-', ' ').toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-6 text-gray-600">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {grant.organization}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              ${grant.amount.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Due {format(grant.submissionDeadline, 'MMM dd, yyyy')}
            </span>
            <span className={`flex items-center gap-1 ${daysToDeadline < 30 ? 'text-red-600' : ''}`}>
              <Clock className="w-4 h-4" />
              {daysToDeadline} days remaining
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
          {!readonly && onEdit && (
            <Button onClick={onEdit} size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          <Button variant="outline" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {progressPercentage.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">Progress</div>
            <Progress value={progressPercentage} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {completedMilestones}/{totalMilestones}
            </div>
            <div className="text-sm text-gray-600">Milestones</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {grant.milestones.flatMap(m => m.tasks).filter(t => t.completed).length}/
              {grant.milestones.flatMap(m => m.tasks).length}
            </div>
            <div className="text-sm text-gray-600">Tasks</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {overdueMilestones}
            </div>
            <div className="text-sm text-gray-600">Overdue</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Description */}
            <Card>
              <CardHeader>
                <CardTitle>Project Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{grant.description}</p>
              </CardContent>
            </Card>

            {/* Key Information */}
            <Card>
              <CardHeader>
                <CardTitle>Key Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="font-medium text-sm text-gray-500">Category</div>
                  <div>{grant.category}</div>
                </div>
                <Separator />
                <div>
                  <div className="font-medium text-sm text-gray-500">Created</div>
                  <div>{format(grant.createdAt, 'PPP')}</div>
                </div>
                <Separator />
                <div>
                  <div className="font-medium text-sm text-gray-500">Last Updated</div>
                  <div>{format(grant.updatedAt, 'PPP')}</div>
                </div>
                {grant.submittedAt && (
                  <>
                    <Separator />
                    <div>
                      <div className="font-medium text-sm text-gray-500">Submitted</div>
                      <div>{format(grant.submittedAt, 'PPP')}</div>
                    </div>
                  </>
                )}
                {grant.teamMembers && grant.teamMembers.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="font-medium text-sm text-gray-500">Team Members</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {grant.teamMembers.map((member, index) => (
                          <Badge key={index} variant="secondary">
                            {member}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Objectives and Methodology */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Objectives</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {grant.objectives}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Methodology</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {grant.methodology}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Budget and Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {grant.budget}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {grant.timeline}
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <GrantTimeline
            grant={grant}
            onUpdateMilestone={onUpdateMilestone}
            onUpdateTask={onUpdateTask}
            readonly={readonly}
          />
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Grant Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Full Project Description</h3>
                <p className="text-gray-700 leading-relaxed">{grant.description}</p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-semibold mb-3">Project Objectives</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{grant.objectives}</p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-semibold mb-3">Methodology & Approach</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{grant.methodology}</p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Budget Breakdown</h3>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded">
                    {grant.budget}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Project Timeline</h3>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded">
                    {grant.timeline}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attachments & Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {grant.attachments && grant.attachments.length > 0 ? (
                <div className="space-y-3">
                  {grant.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-500" />
                        <div>
                          <div className="font-medium">{attachment.name}</div>
                          <div className="text-sm text-gray-500">
                            {attachment.type} • {(attachment.size / 1024).toFixed(1)}KB • 
                            Uploaded {format(attachment.uploadedAt, 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No documents attached</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {grant.notes && grant.notes.length > 0 ? (
                <div className="space-y-4">
                  {grant.notes.map((note) => (
                    <div key={note.id} className="border-l-4 border-blue-200 pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{note.author}</div>
                        <div className="text-sm text-gray-500">
                          {format(note.createdAt, 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                      <p className="text-gray-700">{note.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No notes added</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GrantDetails;