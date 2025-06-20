/**
 * Content Calendar Page
 * Strategic communication planning with grant milestone integration
 * Using react-big-calendar with month/week/day/agenda views
 * Based on attached asset 41 specifications with drag-and-drop support
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { 
  CalendarIcon, 
  Plus, 
  Download,
  Filter,
  Settings,
  Edit2,
  Trash2,
  Clock,
  Users,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

// Import our custom components
import CalendarFilters from '@/components/calendar/CalendarFilters';

// Initialize react-big-calendar with drag-and-drop
const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(Calendar);

// Content calendar interfaces
interface ContentItem {
  id: string;
  title: string;
  content: string;
  contentType: 'post' | 'email' | 'newsletter' | 'announcement' | 'milestone-update' | 'thank-you';
  channel: 'social-media' | 'email' | 'website' | 'newsletter' | 'press-release';
  scheduledDate: Date;
  status: 'draft' | 'scheduled' | 'published' | 'cancelled';
  grantId?: string;
  assignee?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

interface Grant {
  id: string;
  title: string;
  organization: string;
  milestones?: Array<{
    id: string;
    title: string;
    dueDate: Date;
    status: string;
  }>;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: 'content' | 'milestone';
    data: any;
    contentType?: string;
    status?: string;
    priority?: string;
  };
}

interface ContentForm {
  title: string;
  content: string;
  contentType: string;
  channel: string;
  scheduledDate: Date;
  status: string;
  grantId?: string;
  assignee?: string;
  priority?: string;
}

const ContentCalendar: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showContentForm, setShowContentForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [showMilestones, setShowMilestones] = useState(true);
  const [filters, setFilters] = useState({
    contentType: 'all',
    status: 'all',
    grantId: 'all',
    channel: 'all',
    assignee: 'all'
  });

  // Sample data for development
  const sampleContentItems: ContentItem[] = [
    {
      id: '1',
      title: 'NASDAQ Grant Application Announcement',
      content: 'Announcing our new grant application for Q2 2025',
      contentType: 'announcement',
      channel: 'social-media',
      scheduledDate: new Date(2025, 0, 25),
      status: 'scheduled',
      grantId: 'grant-1',
      assignee: 'Sarah Johnson',
      priority: 'high',
      tags: ['announcement', 'grant']
    },
    {
      id: '2',
      title: 'Innovation Hub Newsletter',
      content: 'Monthly newsletter featuring startup success stories',
      contentType: 'newsletter',
      channel: 'email',
      scheduledDate: new Date(2025, 0, 28),
      status: 'draft',
      assignee: 'Mike Chen',
      priority: 'medium',
      tags: ['newsletter', 'monthly']
    },
    {
      id: '3',
      title: 'Thank You Post - Community Support',
      content: 'Gratitude post for community engagement',
      contentType: 'thank-you',
      channel: 'social-media',
      scheduledDate: new Date(2025, 0, 30),
      status: 'published',
      assignee: 'Lisa Park',
      priority: 'low',
      tags: ['gratitude', 'community']
    }
  ];

  const sampleGrants: Grant[] = [
    {
      id: 'grant-1',
      title: 'NASDAQ Entrepreneurship Grant',
      organization: 'NASDAQ Center',
      milestones: [
        {
          id: 'milestone-1',
          title: 'Application Submission',
          dueDate: new Date(2025, 1, 15),
          status: 'pending'
        },
        {
          id: 'milestone-2',
          title: 'Review Period',
          dueDate: new Date(2025, 2, 1),
          status: 'pending'
        }
      ]
    },
    {
      id: 'grant-2',
      title: 'Innovation Hub Funding',
      organization: 'Innovation Hub',
      milestones: [
        {
          id: 'milestone-3',
          title: 'Proposal Draft',
          dueDate: new Date(2025, 1, 20),
          status: 'pending'
        }
      ]
    }
  ];

  // Mock data queries
  const { data: contentData = sampleContentItems, isLoading: contentLoading } = useQuery({
    queryKey: ['/api/content-calendar'],
    queryFn: () => Promise.resolve(sampleContentItems),
    staleTime: 2 * 60 * 1000
  });

  const { data: grantsData = sampleGrants, isLoading: grantsLoading } = useQuery({
    queryKey: ['/api/grants'],
    queryFn: () => Promise.resolve(sampleGrants),
    staleTime: 5 * 60 * 1000
  });

  // Filter content items
  const filteredContent = useMemo(() => {
    return contentData.filter(item => {
      if (filters.contentType !== 'all' && item.contentType !== filters.contentType) return false;
      if (filters.status !== 'all' && item.status !== filters.status) return false;
      if (filters.grantId !== 'all' && item.grantId !== filters.grantId) return false;
      if (filters.channel !== 'all' && item.channel !== filters.channel) return false;
      if (filters.assignee !== 'all' && filters.assignee !== 'unassigned' && item.assignee !== filters.assignee) return false;
      if (filters.assignee === 'unassigned' && item.assignee) return false;
      return true;
    });
  }, [contentData, filters]);

  // Convert content items to calendar events
  const contentEvents = useMemo(() => {
    return filteredContent.map(item => ({
      id: item.id,
      title: item.title,
      start: new Date(item.scheduledDate),
      end: new Date(item.scheduledDate),
      resource: {
        type: 'content' as const,
        data: item,
        contentType: item.contentType,
        status: item.status,
        priority: item.priority
      }
    }));
  }, [filteredContent]);

  // Convert grant milestones to calendar events
  const milestoneEvents = useMemo(() => {
    if (!showMilestones) return [];
    
    return grantsData.flatMap(grant =>
      grant.milestones?.map(milestone => ({
        id: `milestone-${milestone.id}`,
        title: `${grant.title}: ${milestone.title}`,
        start: new Date(milestone.dueDate),
        end: new Date(milestone.dueDate),
        resource: {
          type: 'milestone' as const,
          data: milestone,
          status: milestone.status
        }
      })) || []
    );
  }, [grantsData, showMilestones]);

  // All calendar events
  const allEvents = useMemo(() => {
    return [...contentEvents, ...milestoneEvents];
  }, [contentEvents, milestoneEvents]);

  // Event styling
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const { resource } = event;
    let backgroundColor = '#3366ff';
    let color = '#ffffff';

    // Type-based colors
    if (resource.type === 'content') {
      const typeColors = {
        'post': '#10b981',
        'email': '#f59e0b', 
        'newsletter': '#8b5cf6',
        'announcement': '#ef4444',
        'milestone-update': '#06b6d4',
        'thank-you': '#84cc16'
      };
      backgroundColor = typeColors[resource.contentType as keyof typeof typeColors] || '#3366ff';
    } else if (resource.type === 'milestone') {
      backgroundColor = '#6b7280';
    }

    // Status-based modifications
    if (resource.status === 'published' || resource.status === 'completed') {
      backgroundColor = '#22c55e';
    } else if (resource.status === 'cancelled' || resource.status === 'overdue') {
      backgroundColor = '#dc2626';
    } else if (resource.status === 'draft') {
      backgroundColor = '#9ca3af';
    }

    // Priority-based border
    let border = '1px solid transparent';
    if (resource.priority === 'high') {
      border = '2px solid #dc2626';
    } else if (resource.priority === 'medium') {
      border = '2px solid #f59e0b';
    }

    return {
      style: {
        backgroundColor,
        color,
        border,
        borderRadius: '4px',
        opacity: 0.9,
        fontSize: '12px',
        padding: '2px 4px'
      }
    };
  }, []);

  // Event handlers
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    console.log('Event selected:', event);
  }, []);

  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    setSelectedSlot({ start, end });
    setShowContentForm(true);
  }, []);

  const handleEventDrop = useCallback(({ event, start }: { event: any; start: Date }) => {
    console.log('Event dropped:', event, 'to:', start);
    toast({
      title: "Event Rescheduled",
      description: `"${event.title}" moved to ${format(start, 'MMM dd, yyyy')}`,
    });
  }, [toast]);

  const handleEventResize = useCallback(({ event, start, end }: { event: any; start: Date; end: Date }) => {
    console.log('Event resized:', event, 'from:', start, 'to:', end);
  }, []);

  // Team members for filters
  const teamMembers = useMemo(() => {
    const members = new Set<string>();
    contentData.forEach(item => {
      if (item.assignee) members.add(item.assignee);
    });
    return Array.from(members);
  }, [contentData]);

  if (contentLoading || grantsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Calendar</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Strategic communication planning with grant milestone integration
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <Dialog open={showContentForm} onOpenChange={setShowContentForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Content
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Content</DialogTitle>
              </DialogHeader>
              <ContentCreationForm 
                initialDate={selectedSlot?.start}
                grants={grantsData}
                onSubmit={(data) => {
                  console.log('Content created:', data);
                  setShowContentForm(false);
                  setSelectedSlot(null);
                  toast({
                    title: "Content Created",
                    description: `"${data.title}" scheduled for ${format(data.scheduledDate, 'MMM dd, yyyy')}`,
                  });
                }}
                onCancel={() => {
                  setShowContentForm(false);
                  setSelectedSlot(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <CalendarFilters
        filters={filters}
        onFiltersChange={setFilters}
        showMilestones={showMilestones}
        onShowMilestonesChange={setShowMilestones}
        grants={grantsData}
        teamMembers={teamMembers}
      />

      {/* Content Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Content</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredContent.length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Published</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredContent.filter(item => item.status === 'published').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredContent.filter(item => item.status === 'scheduled').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Milestones</p>
                <p className="text-2xl font-bold text-purple-600">
                  {milestoneEvents.length}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Legend:</span>
            
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Posts</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Emails</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Newsletters</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Announcements</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Milestones</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          <div className="h-96 md:h-[600px]">
            <DragAndDropCalendar
              localizer={localizer}
              events={allEvents}
              views={['month', 'week', 'day', 'agenda']}
              view={currentView}
              date={currentDate}
              onView={setCurrentView}
              onNavigate={setCurrentDate}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              eventPropGetter={eventStyleGetter}
              selectable
              resizable
              popup
              step={60}
              showMultiDayTimes
              className="rbc-calendar"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Content Creation Form Component
const ContentCreationForm: React.FC<{
  initialDate?: Date;
  grants: Grant[];
  onSubmit: (data: ContentForm) => void;
  onCancel: () => void;
}> = ({ initialDate, grants, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<ContentForm>({
    title: '',
    content: '',
    contentType: 'post',
    channel: 'social-media',
    scheduledDate: initialDate || new Date(),
    status: 'draft',
    grantId: '',
    assignee: '',
    priority: 'medium'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="contentType">Content Type</Label>
          <Select value={formData.contentType} onValueChange={(value) => setFormData({ ...formData, contentType: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="post">Post</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="newsletter">Newsletter</SelectItem>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="milestone-update">Milestone Update</SelectItem>
              <SelectItem value="thank-you">Thank You</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="content">Content</Label>
        <textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className="w-full px-3 py-2 border rounded-md h-24"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="channel">Channel</Label>
          <Select value={formData.channel} onValueChange={(value) => setFormData({ ...formData, channel: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="social-media">Social Media</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="newsletter">Newsletter</SelectItem>
              <SelectItem value="press-release">Press Release</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="scheduledDate">Scheduled Date</Label>
          <input
            id="scheduledDate"
            type="datetime-local"
            value={moment(formData.scheduledDate).format('YYYY-MM-DDTHH:mm')}
            onChange={(e) => setFormData({ ...formData, scheduledDate: new Date(e.target.value) })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <Label htmlFor="grantId">Related Grant (Optional)</Label>
          <Select value={formData.grantId} onValueChange={(value) => setFormData({ ...formData, grantId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select a grant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No Grant</SelectItem>
              {grants.map(grant => (
                <SelectItem key={grant.id} value={grant.id}>
                  {grant.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Content
        </Button>
      </div>
    </form>
  );
};

export default ContentCalendar;