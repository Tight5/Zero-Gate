import React, { useState } from 'react';
import { Bell, Settings, User, Sun, Moon, ChevronDown, Building2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useTenant } from '../../contexts/TenantContext';
import './Header.css';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentTenant, tenants, switchTenant } = useTenant();
  const [notifications] = useState([
    { id: 1, title: 'Grant deadline approaching', type: 'warning' },
    { id: 2, title: 'New sponsor relationship mapped', type: 'info' },
    { id: 3, title: 'System backup completed', type: 'success' }
  ]);

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">Zero Gate ESO</div>
      </div>

      <div className="header-center">
        <Select value={currentTenant?.id} onValueChange={switchTenant}>
          <SelectTrigger className="tenant-selector">
            <Building2 size={16} />
            <SelectValue placeholder="Select Organization" />
          </SelectTrigger>
          <SelectContent>
            {tenants?.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="header-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="theme-toggle"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="notification-button">
              <Bell size={16} />
              {notifications.length > 0 && (
                <Badge className="notification-badge" variant="destructive">
                  {notifications.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="notification-dropdown">
            {notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="notification-item">
                <div className="notification-content">
                  <span className="notification-title">{notification.title}</span>
                  <Badge variant={notification.type === 'warning' ? 'destructive' : 'secondary'}>
                    {notification.type}
                  </Badge>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem>View All Notifications</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="user-menu">
              <Avatar className="user-avatar">
                <AvatarFallback>
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="user-info">
                <div className="user-name">{user?.name || 'User'}</div>
                <div className="user-role">{user?.role || 'Member'}</div>
              </div>
              <ChevronDown size={16} />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <User size={16} />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings size={16} />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};