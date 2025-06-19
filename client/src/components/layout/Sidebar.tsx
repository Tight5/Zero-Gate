import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  Gift, 
  Network, 
  Calendar,
  Settings,
  FileText,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Activity,
  Database,
  Zap
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { useTenant } from '../../contexts/TenantContext';
import { useResource } from '../../contexts/ResourceContext';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { currentTenant } = useTenant();
  const { isFeatureEnabled } = useResource();

  const navigationSections = [
    {
      title: 'Overview',
      items: [
        {
          to: '/dashboard',
          icon: BarChart3,
          label: 'Executive Dashboard',
          description: 'Real-time KPIs and system overview',
          badge: null
        }
      ]
    },
    {
      title: 'Core Features',
      items: [
        {
          to: '/sponsors',
          icon: Users,
          label: 'Sponsor Management',
          description: 'Track and manage sponsor relationships',
          badge: null
        },
        {
          to: '/grants',
          icon: Gift,
          label: 'Grant Tracking',
          description: 'Monitor grant applications and timelines',
          badge: 3
        },
        {
          to: '/relationships',
          icon: Network,
          label: 'Relationship Mapping',
          description: 'Visualize stakeholder connections',
          badge: null,
          disabled: !isFeatureEnabled('relationship_mapping')
        },
        {
          to: '/calendar',
          icon: Calendar,
          label: 'Content Calendar',
          description: 'Schedule and track content delivery',
          badge: null
        }
      ]
    },
    {
      title: 'Analytics & Reports',
      items: [
        {
          to: '/analytics',
          icon: TrendingUp,
          label: 'Advanced Analytics',
          description: 'Deep insights and trend analysis',
          badge: null,
          disabled: !isFeatureEnabled('advanced_analytics')
        },
        {
          to: '/reports',
          icon: FileText,
          label: 'Reports',
          description: 'Generate comprehensive reports',
          badge: null
        }
      ]
    },
    {
      title: 'System',
      items: [
        {
          to: '/settings',
          icon: Settings,
          label: 'Settings',
          description: 'Configure system preferences',
          badge: null
        }
      ]
    }
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          {collapsed ? 'ZG' : 'Zero Gate ESO'}
        </div>
        <button 
          className="collapse-toggle"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navigationSections.map((section) => (
          <div key={section.title} className="nav-section">
            {!collapsed && (
              <div className="nav-section-title">{section.title}</div>
            )}

            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => 
                    `nav-item ${isActive ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`
                  }
                >
                  <Icon className="nav-icon" size={20} />
                  {!collapsed && (
                    <>
                      <div className="nav-content">
                        <span className="nav-text">{item.label}</span>
                        <span className="nav-description">{item.description}</span>
                      </div>
                      {item.badge && (
                        <Badge className="nav-badge" variant="destructive">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-content">
          <div className="status-indicator">
            <div className="status-dot"></div>
            <span>System Healthy</span>
          </div>
          {!collapsed && (
            <>
              <div>Tenant: {currentTenant?.name}</div>
              <div>Memory: 84%</div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};