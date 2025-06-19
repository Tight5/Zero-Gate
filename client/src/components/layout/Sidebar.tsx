import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  BarChart3 as DashboardIcon,
  Network as RelationshipsIcon,
  Building2 as SponsorsIcon,
  FileText as GrantsIcon,
  Calendar as CalendarIcon,
  Settings as SettingsIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import './Sidebar.css';

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    path: '/dashboard',
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
    path: '/calendar',
    label: 'Content Calendar',
    icon: CalendarIcon,
    description: 'Plan and schedule content'
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

  return (
    <aside className={cn('sidebar', isCollapsed && 'collapsed')}>
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.startsWith(item.path);
            
            return (
              <li key={item.path} className="nav-item">
                <Link href={item.path}>
                  <a
                    className={cn(
                      'nav-link',
                      isActive && 'active'
                    )}
                    title={item.description}
                  >
                    <IconComponent className="nav-icon" size={20} />
                    {!isCollapsed && (
                      <span className="nav-label">{item.label}</span>
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