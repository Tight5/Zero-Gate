import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  BarChart3 as DashboardIcon,
  Network as RelationshipsIcon,
  Building2 as SponsorsIcon,
  FileText as GrantsIcon,
  Calendar as CalendarIcon,
  Settings as SettingsIcon
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import './Sidebar.css';

const navigationItems = [
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
    path: '/content-calendar',
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
  const [location, setLocation] = useLocation();
  const { currentTenant } = useTenant();

  if (!currentTenant) {
    return null;
  }

  const handleNavigation = (path: string) => {
    setLocation(path);
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location === item.path || location.startsWith(item.path + '/');
            
            return (
              <li key={item.path} className="nav-item">
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavigation(item.path)}
                  title={item.description}
                >
                  <IconComponent className="nav-icon" size={20} />
                  {!isCollapsed && (
                    <span className="nav-label">{item.label}</span>
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;