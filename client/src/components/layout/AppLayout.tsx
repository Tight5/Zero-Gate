import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from './Header';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const handleMenuToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Don't show layout for unauthenticated users
  if (!isAuthenticated || isLoading) {
    return <>{children}</>;
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Header onMenuToggle={handleMenuToggle} />
      <div className="flex">
        <div className="hidden md:block">
          <Sidebar isCollapsed={sidebarCollapsed} />
        </div>
        <main className={cn(
          "flex-1 transition-all duration-300",
          "p-6"
        )}>
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;