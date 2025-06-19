/**
 * Content Form Component
 * Modal form for creating and editing content calendar items
 */

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Send, Save, X, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface ContentItem {
  id?: string;
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
}

interface ContentFormProps {
  initialData?: Partial<ContentItem>;
  selectedSlot?: { start: Date; end: Date };
  grants: Grant[];
  onSubmit: (data: Partial<ContentItem>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const CONTENT_TYPES = [
  { value: 'post', label: 'Social Media Post' },
  { value: 'email', label: 'Email' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'milestone-update', label: 'Milestone Update' },
  { value: 'thank-you', label: 'Thank You Note' }
];

const CHANNELS = [
  { value: 'social-media', label: 'Social Media' },
  { value: 'email', label: 'Email' },
  { value: 'website', label: 'Website' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'press-release', label: 'Press Release' }
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

export const ContentForm: React.FC<ContentFormProps> = ({
  initialData,
  selectedSlot,
  grants,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create'
}) => {
  const [newTag, setNewTag] = React.useState('');

  const form = useForm<Partial<ContentItem>>({
    defaultValues: {
      title: '',
      content: '',
      contentType: 'post',
      channel: 'social-media',
      scheduledDate: selectedSlot?.start || new Date(),
      status: 'draft',
      priority: 'medium',
      tags: [],
      ...initialData
    }
  });

  const { control, handleSubmit, watch, setValue } = form;
  const watchedValues = watch();

  const handleTagAdd = () => {
    if (newTag.trim() && !watchedValues.tags?.includes(newTag.trim())) {
      const currentTags = watchedValues.tags || [];
      setValue('tags', [...currentTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    const currentTags = watchedValues.tags || [];
    setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Controller
              name="title"
              control={control}
              rules={{ required: 'Title is required' }}
              render={({ field }) => (
                <Input {...field} placeholder="Enter content title" />
              )}
            />
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contentType">Content Type *</Label>
            <Controller
              name="contentType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label htmlFor="channel">Channel *</Label>
            <Controller
              name="channel"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(channel => (
                      <SelectItem key={channel.value} value={channel.value}>
                        {channel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="grantId">Associated Grant (Optional)</Label>
          <Controller
            name="grantId"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grant (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No grant association</SelectItem>
                  {grants.map(grant => (
                    <SelectItem key={grant.id} value={grant.id}>
                      <div>
                        <div className="font-medium">{grant.title}</div>
                        <div className="text-xs text-gray-500">{grant.organization}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label htmlFor="content">Content *</Label>
          <Controller
            name="content"
            control={control}
            rules={{ required: 'Content is required' }}
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder="Enter your content here..."
                rows={6}
              />
            )}
          />
          <div className="text-xs text-gray-500 mt-1">
            Character count: {watchedValues.content?.length || 0}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="scheduledDate">Scheduled Date *</Label>
            <Controller
              name="scheduledDate"
              control={control}
              render={({ field }) => (
                <Input
                  type="datetime-local"
                  {...field}
                  value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                />
              )}
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div>
          <Label>Tags</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              placeholder="Add tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd())}
              className="flex-1"
            />
            <Button type="button" onClick={handleTagAdd} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(watchedValues.tags || []).map((tag, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {tag}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => handleTagRemove(tag)}
                />
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-transparent border-t-white"></div>
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {mode === 'create' ? 'Create Content' : 'Update Content'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ContentForm;