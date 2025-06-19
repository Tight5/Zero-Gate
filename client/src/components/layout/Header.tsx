import React, { useState } from 'react';
import { 
  Menu as MenuIcon,
  Settings as SettingsIcon,
  LogOut as LogoutIcon,
  Moon as MoonIcon,
  Sun as SunIcon,
  Bell as BellIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import TenantSelector from '../common/TenantSelector';
import NotificationCenter from '../common/NotificationCenter';
import './Header.css';

interface HeaderProps {
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
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
          <h1 className="app-title text-xl font-bold">
            Zero Gate
          </h1>
        </div>
      </div>

      <div className="header-center">
        <TenantSelector />
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
          {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
        </Button>

        <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="user-menu-trigger flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage 
                  src={user?.profileImageUrl} 
                  alt={user?.firstName || 'User'} 
                />
                <AvatarFallback>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="user-name hidden md:inline">
                {user?.firstName} {user?.lastName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
              <SettingsIcon size={16} className="mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="logout-item">
              <LogoutIcon size={16} className="mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <NotificationCenter
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </header>
  );
};

export default Header;