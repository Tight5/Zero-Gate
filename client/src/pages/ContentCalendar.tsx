/**
 * Content Calendar Page
 * Strategic communication planning with grant milestone integration
 * Using react-big-calendar with month/week/day/agenda views
 * Based on attached asset 41 specifications
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import { 
  CalendarIcon, 
  Plus, 
  Download,
  Filter,
  Settings
} from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/calendar.css';

// Import our custom components
import ContentForm from '@/components/calendar/ContentForm';
import CalendarFilters from '@/components/calendar/CalendarFilters';

// Initialize react-big-calendar localizer
const localizer = momentLocalizer(moment);

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
  tags?: string[];
  assignee?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
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

const ContentCalendar: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const { user } = useAuth();
  
  // State management
  const [filters, setFilters] = useState({
    contentType: 'all',
    status: 'all',
    grantId: 'all',
    channel: 'all',
    assignee: 'all'
  });
  const [showMilestones, setShowMilestones] = useState(true);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Data fetching
  const { data: contentItems = [], isLoading: contentLoading } = useQuery({
    queryKey: ['/api/content-calendar'],
    enabled: !!tenant?.id,
    refetchInterval: 180000, // 3 minutes - optimized for memory
    staleTime: 120000, // 2 minutes
  });

  const { data: grants = [], isLoading: grantsLoading } = useQuery({
    queryKey: ['/api/grants'],
    enabled: !!tenant?.id,
    refetchInterval: 300000, // 5 minutes
    staleTime: 240000, // 4 minutes
  });

  const isLoading = contentLoading || grantsLoading;

  // Transform data for calendar events
  const events = useMemo(() => {
    const contentEvents: CalendarEvent[] = (contentItems || [])
      .filter((item: any) => {
        if (filters.contentType !== 'all' && item.contentType !== filters.contentType) return false;
        if (filters.status !== 'all' && item.status !== filters.status) return false;
        if (filters.grantId !== 'all' && item.grantId !== filters.grantId) return false;
        if (filters.channel !== 'all' && item.channel !== filters.channel) return false;
        if (filters.assignee !== 'all' && item.assignee !== filters.assignee) return false;
        return true;
      })
      .map((item: any) => ({
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

    // Add grant milestones as events if enabled
    const milestoneEvents: CalendarEvent[] = showMilestones && grants?.length
      ? grants.flatMap((grant: any) => 
          (grant.milestones || []).map((milestone: any) => ({
            id: `milestone-${milestone.id}`,
            title: `📍 ${milestone.title}`,
            start: new Date(milestone.dueDate),
            end: new Date(milestone.dueDate),
            resource: {
              type: 'milestone' as const,
              data: { ...milestone, grantTitle: grant.title, grantId: grant.id },
              contentType: 'milestone',
              status: milestone.status
            }
          }))
        )
      : [];

    return [...contentEvents, ...milestoneEvents];
  }, [contentItems, grants, filters, showMilestones]);

  // Create/Update mutations
  const createItemMutation = useMutation({
    mutationFn: async (data: Partial<ContentItem>) => {
      const response = await fetch('/api/content-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`Failed to create content: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-calendar'] });
      setIsDialogOpen(false);
      setEditingItem(null);
      setSelectedSlot(null);
      toast({
        title: "Content Created",
        description: "Content item has been successfully created.",
      });
    },
    onError: (error) => {
      console.error('Create content error:', error);
      toast({
        title: "Error",
        description: "Failed to create content item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContentItem> }) => {
      const response = await fetch(`/api/content-calendar/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`Failed to update content: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-calendar'] });
      setIsDialogOpen(false);
      setEditingItem(null);
      toast({
        title: "Content Updated",
        description: "Content item has been successfully updated.",
      });
    },
    onError: (error) => {
      console.error('Update content error:', error);
      toast({
        title: "Error",
        description: "Failed to update content item. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Calendar event styling
  const eventStyleGetter = useCallback((event: any) => {
    const baseStyle = {
      borderRadius: '4px',
      border: 'none',
      color: 'white',
      fontSize: '12px',
      fontWeight: '500',
    };

    // Color by content type
    const typeColors: Record<string, string> = {
      post: '#10b981', // green
      email: '#f59e0b', // amber
      newsletter: '#8b5cf6', // violet
      announcement: '#ef4444', // red
      'milestone-update': '#06b6d4', // cyan
      'thank-you': '#ec4899', // pink
      milestone: '#6b7280', // gray for grant milestones
    };

    // Priority styling
    const priorityBorders: Record<string, string> = {
      urgent: '2px solid #dc2626',
      high: '2px solid #f59e0b',
      medium: '1px solid transparent',
      low: '1px dashed #9ca3af',
    };

    const backgroundColor = typeColors[event.resource?.contentType] || '#3b82f6';
    const border = event.resource?.priority ? priorityBorders[event.resource.priority] : '1px solid transparent';

    return {
      style: {
        ...baseStyle,
        backgroundColor,
        border,
        opacity: event.resource?.status === 'published' ? 1 : 0.8,
      },
    };
  }, []);

  // Calendar event handlers
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    setSelectedSlot({ start, end });
    setEditingItem(null);
    setIsDialogOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: any) => {
    if (event.resource?.type === 'content') {
      setEditingItem(event.resource.data as ContentItem);
      setSelectedSlot(null);
      setIsDialogOpen(true);
    } else if (event.resource?.type === 'milestone') {
      // Auto-create milestone update content
      const milestone = event.resource.data;
      const newContent: Partial<ContentItem> = {
        title: `Milestone Update: ${milestone?.title || 'Grant Milestone'}`,
        content: `Great progress on our project! We're approaching a key milestone.`,
        contentType: 'milestone-update',
        channel: 'social-media',
        scheduledDate: new Date(),
        status: 'draft',
        grantId: milestone?.grantId,
        priority: 'medium',
        tags: ['milestone', 'progress']
      };
      
      setEditingItem(newContent as ContentItem);
      setSelectedSlot(null);
      setIsDialogOpen(true);
    }
  }, []);

  const handleEventDrop = useCallback(({ event, start }: { event: any; start: Date }) => {
    if (event.resource?.type === 'content') {
      const contentItem = event.resource.data as ContentItem;
      updateItemMutation.mutate({
        id: contentItem.id,
        data: { scheduledDate: start }
      });
    }
  }, [updateItemMutation]);

  const handleCreateItem = (data: Partial<ContentItem>) => {
    if (editingItem?.id) {
      updateItemMutation.mutate({ id: editingItem.id, data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8" />
            Content Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            Plan and schedule content with grant milestone integration
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Content
          </Button>
        </div>
      </div>

      {/* Filters */}
      <CalendarFilters
        filters={filters}
        onFiltersChange={setFilters}
        showMilestones={showMilestones}
        onShowMilestonesChange={setShowMilestones}
        grants={grants}
      />

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Content Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
            view={currentView}
            onView={setCurrentView}
            date={currentDate}
            onNavigate={setCurrentDate}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            popup
            views={['month', 'week', 'day', 'agenda']}
            step={60}
            showMultiDayTimes
          />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{events.filter(e => e.resource.type === 'content').length}</div>
            <div className="text-sm text-muted-foreground">Scheduled Content</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {events.filter(e => e.resource.status === 'published').length}
            </div>
            <div className="text-sm text-muted-foreground">Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {events.filter(e => e.resource.status === 'draft').length}
            </div>
            <div className="text-sm text-muted-foreground">Drafts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {events.filter(e => e.resource.type === 'milestone').length}
            </div>
            <div className="text-sm text-muted-foreground">Milestones</div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? 'Edit Content' : 'Create Content'}
            </DialogTitle>
          </DialogHeader>
          <ContentForm
            initialData={editingItem || undefined}
            selectedSlot={selectedSlot || undefined}
            grants={grants}
            onSubmit={handleCreateItem}
            onCancel={() => setIsDialogOpen(false)}
            isLoading={createItemMutation.isPending || updateItemMutation.isPending}
            mode={editingItem?.id ? 'edit' : 'create'}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentCalendar;