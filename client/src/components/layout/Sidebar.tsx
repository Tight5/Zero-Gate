import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  Settings, 
  Award,
  Network,
  FileText,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isCollapsed: boolean;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Sponsors', href: '/sponsors', icon: Users },
  { name: 'Grants', href: '/grants', icon: Award },
  { name: 'Relationships', href: '/relationships', icon: Network },
  { name: 'Content Calendar', href: '/content-calendar', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed }) => {
  const [location] = useLocation();

  return (
    <aside className={cn(
      "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-40",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <nav className="h-full px-3 py-4 overflow-y-auto">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isCollapsed ? "px-2" : "px-4",
                      isActive && "bg-primary/10 text-primary"
                    )}
                  >
                    <Icon size={20} className={cn("flex-shrink-0", !isCollapsed && "mr-3")} />
                    {!isCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Button>
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