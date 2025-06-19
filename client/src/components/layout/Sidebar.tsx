/**
 * Sidebar Layout Component
 * Based on attached asset File 21 specification with @replit/ui components
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  BarChart3 as DashboardIcon,
  Network as RelationshipsIcon,
  Building2 as SponsorsIcon,
  FileText as GrantsIcon,
  Calendar as CalendarIcon,
  Settings as SettingsIcon
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import './Sidebar.css';

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<any>;
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
  const location = useLocation();
  const { currentTenant } = useTenant();

  if (!currentTenant) {
    return null;
  }

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            
            return (
              <li key={item.path} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  title={item.description}
                >
                  <IconComponent className="nav-icon" size={20} />
                  {!isCollapsed && (
                    <span className="nav-label">{item.label}</span>
                  )}
                  {!isCollapsed && isActive && (
                    <div className="active-indicator" />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;