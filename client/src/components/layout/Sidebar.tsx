import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { 
  BarChart3 as DashboardIcon,
  Network as RelationshipsIcon,
  Building2 as SponsorsIcon,
  FileText as GrantsIcon,
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
  PieChart as AnalyticsIcon
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';

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
    description: 'Performance insights'
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
    description: 'Platform configuration'
  }
];

interface SidebarProps {
  isCollapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed }) => {
  const [location] = useLocation();
  const { currentTenant } = useTenant();

  if (!currentTenant) {
    return null;
  }

  return (
    <aside className={cn(
      "flex flex-col h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path));
            
            return (
              <li key={item.path}>
                <Link href={item.path}>
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      "hover:bg-slate-100 dark:hover:bg-slate-700",
                      isActive 
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100" 
                        : "text-slate-700 dark:text-slate-300"
                    )}
                    title={item.description}
                  >
                    <IconComponent className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
                    {!isCollapsed && (
                      <span>{item.label}</span>
                    )}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;