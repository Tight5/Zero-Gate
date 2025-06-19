import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTenant } from '../../contexts/TenantContext';
import Header from './Header';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { theme } = useTheme();
  const { currentTenant } = useTenant();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const handleMenuToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  return (
    <div className={cn(
      "min-h-screen bg-slate-50 dark:bg-slate-900",
      theme === 'dark' && 'dark'
    )}>
      <Header onMenuToggle={handleMenuToggle} />
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar isCollapsed={sidebarCollapsed} />
        <main className="flex-1 overflow-auto">
          {currentTenant ? (
            <div className="p-6">
              {children}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Select a Tenant
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Please select a tenant to access the platform features.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;