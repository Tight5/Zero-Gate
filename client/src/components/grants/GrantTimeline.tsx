/**
 * Grant Timeline Component
 * Advanced milestone tracking with 90/60/30-day backwards planning
 * Based on attached asset 28 specifications
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, CheckCircle, AlertTriangle, Target, Plus, Edit } from 'lucide-react';
import { format, differenceInDays, addDays, isBefore, isAfter } from 'date-fns';

interface GrantMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  completedDate?: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  type: '90-day' | '60-day' | '30-day' | 'submission' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'critical';
  tasks: GrantTask[];
  dependencies: string[];
}

interface GrantTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  assignee?: string;
  dueDate: Date;
  estimatedHours: number;
  actualHours?: number;
}

interface Grant {
  id: string;
  title: string;
  submissionDeadline: Date;
  amount: number;
  status: 'draft' | 'submitted' | 'under-review' | 'awarded' | 'rejected';
  organization: string;
  milestones: GrantMilestone[];
}

interface GrantTimelineProps {
  grant: Grant;
  onUpdateMilestone?: (milestoneId: string, updates: Partial<GrantMilestone>) => void;
  onUpdateTask?: (milestoneId: string, taskId: string, updates: Partial<GrantTask>) => void;
  onAddMilestone?: () => void;
  readonly?: boolean;
}

export const GrantTimeline: React.FC<GrantTimelineProps> = ({
  grant,
  onUpdateMilestone,
  onUpdateTask,
  onAddMilestone,
  readonly = false
}) => {
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);

  // Calculate timeline metrics
  const timelineMetrics = useMemo(() => {
    const now = new Date();
    const totalMilestones = grant.milestones.length;
    const completedMilestones = grant.milestones.filter(m => m.status === 'completed').length;
    const overdueMilestones = grant.milestones.filter(m => 
      m.status !== 'completed' && isBefore(m.dueDate, now)
    ).length;
    
    const totalTasks = grant.milestones.flatMap(m => m.tasks).length;
    const completedTasks = grant.milestones.flatMap(m => m.tasks).filter(t => t.completed).length;
    
    const daysToDeadline = differenceInDays(grant.submissionDeadline, now);
    const progressPercentage = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
    
    return {
      progressPercentage,
      completedMilestones,
      totalMilestones,
      overdueMilestones,
      completedTasks,
      totalTasks,
      daysToDeadline,
      isOnTrack: overdueMilestones === 0 && daysToDeadline > 0
    };
  }, [grant]);

  // Sort milestones by due date
  const sortedMilestones = useMemo(() => {
    return [...grant.milestones].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [grant.milestones]);

  const getMilestoneStatusIcon = (milestone: GrantMilestone) => {
    switch (milestone.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Target className="w-5 h-5 text-gray-400" />;
    }
  };

  const getMilestoneStatusColor = (milestone: GrantMilestone) => {
    switch (milestone.status) {
      case 'completed':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'overdue':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'in-progress':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const handleTaskToggle = (milestoneId: string, taskId: string, completed: boolean) => {
    if (readonly || !onUpdateTask) return;
    
    onUpdateTask(milestoneId, taskId, { 
      completed,
      ...(completed && { actualHours: 0 }) // Can be updated later
    });
  };

  const handleMilestoneComplete = (milestoneId: string) => {
    if (readonly || !onUpdateMilestone) return;
    
    const milestone = grant.milestones.find(m => m.id === milestoneId);
    if (!milestone) return;
    
    const newStatus = milestone.status === 'completed' ? 'pending' : 'completed';
    const updates: Partial<GrantMilestone> = {
      status: newStatus,
      ...(newStatus === 'completed' && { completedDate: new Date() })
    };
    
    onUpdateMilestone(milestoneId, updates);
  };

  return (
    <div className="space-y-6">
      {/* Timeline Header & Metrics */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Grant Timeline - {grant.title}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Submission deadline: {format(grant.submissionDeadline, 'MMM dd, yyyy')}
                <span className={`ml-2 ${timelineMetrics.daysToDeadline < 30 ? 'text-red-600' : 'text-gray-600'}`}>
                  ({timelineMetrics.daysToDeadline} days remaining)
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant={timelineMetrics.isOnTrack ? 'default' : 'destructive'}>
                {timelineMetrics.isOnTrack ? 'On Track' : 'Behind Schedule'}
              </Badge>
              <Badge variant="outline">
                ${grant.amount.toLocaleString()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {timelineMetrics.progressPercentage.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Overall Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {timelineMetrics.completedMilestones}/{timelineMetrics.totalMilestones}
              </div>
              <div className="text-sm text-gray-600">Milestones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {timelineMetrics.completedTasks}/{timelineMetrics.totalTasks}
              </div>
              <div className="text-sm text-gray-600">Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {timelineMetrics.overdueMilestones}
              </div>
              <div className="text-sm text-gray-600">Overdue</div>
            </div>
          </div>
          
          <Progress value={timelineMetrics.progressPercentage} className="w-full" />
        </CardContent>
      </Card>

      {/* Milestones Timeline */}
      <div className="space-y-4">
        {sortedMilestones.map((milestone, index) => {
          const isSelected = selectedMilestone === milestone.id;
          const taskCompletion = milestone.tasks.length > 0 
            ? (milestone.tasks.filter(t => t.completed).length / milestone.tasks.length) * 100 
            : 0;
          
          return (
            <Card 
              key={milestone.id} 
              className={`${getMilestoneStatusColor(milestone)} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {getMilestoneStatusIcon(milestone)}
                    <div>
                      <CardTitle className="text-lg">{milestone.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={getPriorityBadgeVariant(milestone.priority) as any}>
                      {milestone.priority}
                    </Badge>
                    <Badge variant="outline">
                      {milestone.type}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    Due: {format(milestone.dueDate, 'MMM dd, yyyy')}
                    <span className="text-xs">
                      ({differenceInDays(milestone.dueDate, new Date())} days)
                    </span>
                  </div>
                  {!readonly && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMilestoneComplete(milestone.id)}
                      >
                        {milestone.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedMilestone(isSelected ? null : milestone.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              {(isSelected || milestone.tasks.length > 0) && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Tasks ({milestone.tasks.filter(t => t.completed).length}/{milestone.tasks.length})
                      </span>
                      <Progress value={taskCompletion} className="w-24 h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      {milestone.tasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-3 p-2 rounded border">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={(checked) => 
                              handleTaskToggle(milestone.id, task.id, checked as boolean)
                            }
                            disabled={readonly}
                          />
                          <div className="flex-1">
                            <div className={`text-sm ${task.completed ? 'line-through text-gray-500' : ''}`}>
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="text-xs text-gray-600 mt-1">{task.description}</div>
                            )}
                            <div className="flex gap-4 text-xs text-gray-500 mt-1">
                              <span>Due: {format(task.dueDate, 'MMM dd')}</span>
                              <span>Est: {task.estimatedHours}h</span>
                              {task.actualHours && <span>Actual: {task.actualHours}h</span>}
                              {task.assignee && <span>Assignee: {task.assignee}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {!readonly && (
                      <Button size="sm" variant="ghost" className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                      </Button>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Milestone Button */}
      {!readonly && onAddMilestone && (
        <Button onClick={onAddMilestone} className="w-full" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add Milestone
        </Button>
      )}
    </div>
  );
};

export default GrantTimeline;