/**
 * Content Calendar Page
 * Strategic communication planning with grant milestone integration
 * Using react-big-calendar with month/week/day/agenda views
 * Based on attached asset 41 specifications
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { 
  CalendarIcon, 
  Plus, 
  Edit3, 
  Trash2, 
  Clock, 
  Tag, 
  Users,
  Filter,
  Download,
  Target,
  Share,
  Bell,
  CheckCircle,
  Settings
} from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  createdAt: Date;
  updatedAt: Date;
}

interface Grant {
  id: string;
  title: string;
  organization: string;
  amount: number;
  submissionDeadline: Date;
  status: string;
  milestones: Array<{
    id: string;
    title: string;
    dueDate: Date;
    status: string;
    type: string;
  }>;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: 'content' | 'milestone';
    data: ContentItem | any;
    contentType?: string;
    status?: string;
    grantId?: string;
    channel?: string;
    priority?: string;
  };
}

export default function ContentCalendar() {
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [date, setDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [filters, setFilters] = useState({
    contentType: 'all',
    status: 'all',
    grantId: 'all',
    channel: 'all',
    assignee: 'all'
  });
  const [showMilestones, setShowMilestones] = useState(true);
  
  const { toast } = useToast();
  const { selectedTenant } = useTenant();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Fetch content items
  const { data: contentItems = [], isLoading } = useQuery<ContentItem[]>({
    queryKey: ['/api/content-calendar', selectedTenant],
    queryFn: async () => {
      const res = await fetch('/api/content-calendar', {
        credentials: 'include',
        headers: {
          'X-Tenant-ID': selectedTenant,
        },
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: !!selectedTenant && isAuthenticated,
  });

  // Fetch grants for milestone integration
  const { data: grants = [] } = useQuery<Grant[]>({
    queryKey: ['/api/grants', selectedTenant],
    queryFn: async () => {
      const res = await fetch('/api/grants', {
        credentials: 'include',
        headers: {
          'X-Tenant-ID': selectedTenant,
        },
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: !!selectedTenant && isAuthenticated,
  });

  // Transform content data for calendar events
  const events = useMemo(() => {
    if (!contentItems?.length) return [];
    
    const contentEvents: CalendarEvent[] = contentItems
      .filter(item => {
        if (filters.contentType !== 'all' && item.contentType !== filters.contentType) return false;
        if (filters.status !== 'all' && item.status !== filters.status) return false;
        if (filters.grantId !== 'all' && item.grantId !== filters.grantId) return false;
        if (filters.channel !== 'all' && item.channel !== filters.channel) return false;
        if (filters.assignee !== 'all' && item.assignee !== filters.assignee) return false;
        return true;
      })
      .map(item => ({
        id: item.id,
        title: item.title,
        start: new Date(item.scheduledDate),
        end: new Date(item.scheduledDate),
        resource: {
          type: 'content' as const,
          data: item,
          contentType: item.contentType,
          status: item.status,
          grantId: item.grantId,
          channel: item.channel,
          priority: item.priority
        }
      }));

    // Add grant milestones as events if enabled
    const milestoneEvents: CalendarEvent[] = showMilestones && grants?.length
      ? grants.flatMap(grant => 
          grant.milestones.map(milestone => ({
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

  // Mutations for CRUD operations
  const createItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof contentItemSchema>) => {
      const res = await fetch('/api/content-calendar', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': selectedTenant,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-calendar'] });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
      toast({
        title: 'Success',
        description: 'Content item created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create content item: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof contentItemSchema>> }) => {
      const res = await fetch(`/api/content-calendar/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': selectedTenant,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-calendar'] });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
      toast({
        title: 'Success',
        description: 'Content item updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update content item: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => 
      await apiRequest('DELETE', `/api/content-calendar/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-calendar'] });
      toast({
        title: 'Success',
        description: 'Content item deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete content item: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ContentCalendarFormData) => {
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  const handleEdit = (item: ContentCalendar) => {
    setEditingItem(item);
    form.reset({
      title: item.title,
      content: item.content || '',
      scheduledDate: new Date(item.scheduledDate),
      status: item.status || 'draft',
      grantId: item.grantId || '',
      platform: item.platform || '',
      tenantId: 'default-tenant',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this content item?')) {
      deleteItemMutation.mutate(id);
    }
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'post': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'article': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'video': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'newsletter': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'social': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'published': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'archived': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getItemsForDate = (date: Date) => {
    return contentItems.filter(item => 
      isSameDay(new Date(item.scheduledDate), date)
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Content Calendar</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Calendar</h1>
          <p className="text-muted-foreground">
            Plan and manage your content strategy
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            onClick={() => setViewMode('month')}
            size="sm"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Month
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            size="sm"
          >
            List
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingItem(null);
                form.reset();
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Content
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit Content Item' : 'Create Content Item'}
                </DialogTitle>
                <DialogDescription>
                  {editingItem ? 'Update the content item details' : 'Plan a new content item for your calendar'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Content title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="platform"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Platform</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select platform" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="social">Social Media</SelectItem>
                              <SelectItem value="website">Website</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="blog">Blog</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Content description or notes"
                            className="min-h-[100px]"
                            value={field.value || ''}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="grantId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Grant</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select grant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">No grant</SelectItem>
                              {grants.map((grant: any) => (
                                <SelectItem key={grant.id} value={grant.id}>
                                  {grant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createItemMutation.isPending || updateItemMutation.isPending}
                    >
                      {editingItem ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === 'month' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {format(selectedDate, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map(day => {
                const dayItems = getItemsForDate(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, selectedDate);
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[120px] p-2 border rounded-lg ${
                      isCurrentMonth ? 'bg-background' : 'bg-muted/50'
                    } ${isToday ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className={`text-sm ${
                      isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                    } ${isToday ? 'font-bold' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1 mt-1">
                      {dayItems.map(item => (
                        <div
                          key={item.id}
                          className="text-xs p-1 rounded cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: 'hsl(var(--accent))' }}
                          onClick={() => handleEdit(item)}
                        >
                          <div className="font-medium truncate">{item.title}</div>
                          <div className="flex items-center space-x-1">
                            <Badge variant="secondary" className="text-xs">
                              {item.platform || 'General'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {contentItems.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No content items yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start planning your content strategy by creating your first item.
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Content
                </Button>
              </CardContent>
            </Card>
          ) : (
            contentItems.map((item: ContentCalendar) => (
              <Card key={item.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-medium">{item.title}</h3>
                        <Badge variant="secondary">
                          <Tag className="w-3 h-3 mr-1" />
                          {item.platform || 'General'}
                        </Badge>
                        <Badge className={getStatusColor(item.status || 'draft')}>
                          {item.status || 'Draft'}
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mb-2">
                        <Clock className="w-4 h-4 mr-1" />
                        {format(new Date(item.scheduledDate), 'MMM d, yyyy')}
                        {item.grantId && (
                          <>
                            <Users className="w-4 h-4 ml-4 mr-1" />
                            Grant linked
                          </>
                        )}
                      </div>
                      {item.content && (
                        <p className="text-muted-foreground line-clamp-2">{item.content}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}