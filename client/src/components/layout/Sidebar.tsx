import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  BarChart3 as DashboardIcon,
  Network as RelationshipsIcon,
  Building2 as SponsorsIcon,
  FileText as GrantsIcon,
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
  PieChart as AnalyticsIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  isCollapsed?: boolean;
}

const navigationItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: DashboardIcon,
    description: 'Executive overview and KPIs'
  },
  {
    path: '/relationships',
    label: 'Relationship Mapping',
    icon: RelationshipsIcon,
    description: 'Visualize stakeholder connections'
  },
  {
    path: '/sponsors',
    label: 'Sponsor Management',
    icon: SponsorsIcon,
    description: 'Manage sponsor relationships'
  },
  {
    path: '/grants',
    label: 'Grant Management',
    icon: GrantsIcon,
    description: 'Track grants and timelines'
  },
  {
    path: '/content-calendar',
    label: 'Content Calendar',
    icon: CalendarIcon,
    description: 'Plan and schedule content'
  },
  {
    path: '/analytics',
    label: 'Analytics',
    icon: AnalyticsIcon,
    description: 'Advanced analytics and insights'
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
    description: 'Platform configuration'
  }
];

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false }) => {
  const [location] = useLocation();

  return (
    <div className={cn(
      "relative flex flex-col bg-background border-r transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-2">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path));
            
            return (
              <li key={item.path} className="nav-item">
                <Link href={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-start gap-2 h-10",
                      isCollapsed && "px-2",
                      isActive && "bg-secondary"
                    )}
                    title={isCollapsed ? item.description : undefined}
                  >
                    <IconComponent className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Button>
                </Link>
              </li>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
};

export default Sidebar;