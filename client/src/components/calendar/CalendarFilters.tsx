/**
 * Calendar Filters Component
 * Advanced filtering controls for content calendar
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

interface Grant {
  id: string;
  title: string;
  organization: string;
}

interface CalendarFiltersProps {
  filters: {
    contentType: string;
    status: string;
    grantId: string;
    channel: string;
    assignee: string;
  };
  onFiltersChange: (filters: any) => void;
  showMilestones: boolean;
  onShowMilestonesChange: (show: boolean) => void;
  grants: Grant[];
  teamMembers?: string[];
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  filters,
  onFiltersChange,
  showMilestones,
  onShowMilestonesChange,
  grants,
  teamMembers = []
}) => {
  const hasActiveFilters = Object.values(filters).some(value => value !== 'all');

  const clearAllFilters = () => {
    onFiltersChange({
      contentType: 'all',
      status: 'all',
      grantId: 'all',
      channel: 'all',
      assignee: 'all'
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filters</span>
          </div>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <Label className="text-xs">Content Type</Label>
            <Select 
              value={filters.contentType} 
              onValueChange={(value) => onFiltersChange({ ...filters, contentType: value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="post">Posts</SelectItem>
                <SelectItem value="email">Emails</SelectItem>
                <SelectItem value="newsletter">Newsletters</SelectItem>
                <SelectItem value="announcement">Announcements</SelectItem>
                <SelectItem value="milestone-update">Milestone Updates</SelectItem>
                <SelectItem value="thank-you">Thank You Notes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Status</Label>
            <Select 
              value={filters.status} 
              onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Channel</Label>
            <Select 
              value={filters.channel} 
              onValueChange={(value) => onFiltersChange({ ...filters, channel: value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="social-media">Social Media</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="newsletter">Newsletter</SelectItem>
                <SelectItem value="press-release">Press Release</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Grant</Label>
            <Select 
              value={filters.grantId} 
              onValueChange={(value) => onFiltersChange({ ...filters, grantId: value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="All Grants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grants</SelectItem>
                {grants.map(grant => (
                  <SelectItem key={grant.id} value={grant.id}>
                    <div className="truncate max-w-32">
                      {grant.title}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Assignee</Label>
            <Select 
              value={filters.assignee} 
              onValueChange={(value) => onFiltersChange({ ...filters, assignee: value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="All Members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="">Unassigned</SelectItem>
                {teamMembers.map(member => (
                  <SelectItem key={member} value={member}>
                    {member}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={showMilestones}
              onCheckedChange={onShowMilestonesChange}
              id="show-milestones"
            />
            <Label htmlFor="show-milestones" className="text-xs">
              Show Milestones
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarFilters;