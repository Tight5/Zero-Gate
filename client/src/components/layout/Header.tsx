import React, { useState } from 'react';
import { Link } from 'wouter';
import { 
  Menu as MenuIcon,
  Settings as SettingsIcon,
  LogOut as LogoutIcon,
  Moon as MoonIcon,
  Sun as SunIcon,
  Bell as BellIcon,
  User as UserIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, isAuthenticated } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  if (!isAuthenticated) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="md:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          
          <Link href="/" className="flex items-center space-x-2">
            <div className="font-bold text-xl">Zero Gate</div>
          </Link>
          
          {user?.currentTenantId && (
            <Badge variant="secondary" className="hidden md:inline-flex">
              Tenant Active
            </Badge>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative"
          >
            <BellIcon className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl || ''} alt={user?.email || 'User'} />
                  <AvatarFallback>
                    <UserIcon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user?.firstName && user?.lastName && (
                    <p className="font-medium">{user.firstName} {user.lastName}</p>
                  )}
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="w-full flex items-center">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogoutIcon className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;