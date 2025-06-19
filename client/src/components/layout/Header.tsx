/**
 * Header Layout Component
 * Based on attached asset File 20 specification with @replit/ui components
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Menu as MenuIcon,
  Settings as SettingsIcon,
  LogOut as LogoutIcon,
  Moon as MoonIcon,
  Sun as SunIcon,
  Bell as BellIcon
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './Header.css';

interface HeaderProps {
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const toggleTheme = () => {
    // Theme toggle implementation
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuToggle}
          className="menu-toggle"
          aria-label="Toggle sidebar"
        >
          <MenuIcon size={20} />
        </Button>
        <div className="logo-section">
          <h1 className="app-title">
            Zero Gate
          </h1>
          <span className="tenant-indicator">
            ESO Platform
          </span>
        </div>
      </div>

      <div className="header-center">
        {/* Tenant selector placeholder - will be implemented later */}
      </div>

      <div className="header-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setNotificationsOpen(true)}
          aria-label="Notifications"
          className="notification-button"
        >
          <BellIcon size={20} />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          <MoonIcon size={20} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="user-menu-trigger">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || ''} />
                <AvatarFallback>{user?.firstName?.[0] || user?.email?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <span className="user-name">{user?.firstName || user?.email || 'User'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {/* Navigate to settings */}}>
              <SettingsIcon className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="logout-item">
              <LogoutIcon className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;