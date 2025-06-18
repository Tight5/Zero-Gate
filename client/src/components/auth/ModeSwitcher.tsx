import React, { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Building2, Settings, User, Crown } from 'lucide-react';
import { useAuthMode } from '@/contexts/AuthModeContext';

interface ModeSwitcherProps {
  className?: string;
  showCard?: boolean;
}

const ModeSwitcher = memo(function ModeSwitcher({ className = '', showCard = false }: ModeSwitcherProps) {
  const { mode, switchMode, getCurrentEmail, isAdminMode, isTenantMode } = useAuthMode();

  const handleModeChange = useCallback((checked: boolean) => {
    const newMode = checked ? 'admin' : 'tenant';
    switchMode(newMode);
  }, [switchMode]);

  const content = (
    <div className={`mode-switcher ${className}`}>
      <div className="flex items-center justify-between">
        <div className="mode-info flex items-center gap-3">
          <div className="mode-icon">
            {isAdminMode ? (
              <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
          </div>
          
          <div className="mode-details">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {isAdminMode ? 'Admin Mode' : 'Tenant Mode'}
              </span>
              <Badge 
                variant={isAdminMode ? 'destructive' : 'default'}
                className="text-xs"
              >
                {isAdminMode ? (
                  <>
                    <Crown className="h-3 w-3 mr-1" />
                    Development
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    Production
                  </>
                )}
              </Badge>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {getCurrentEmail()}
            </div>
          </div>
        </div>
        
        <div className="mode-toggle flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Tenant
          </span>
          <Switch
            checked={isAdminMode}
            onCheckedChange={handleModeChange}
            className="data-[state=checked]:bg-blue-600"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Admin
          </span>
        </div>
      </div>
      
      {isAdminMode && (
        <div className="admin-warning mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs text-amber-800 dark:text-amber-200">
              Development mode - Full system access enabled
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (showCard) {
    return (
      <Card className="mode-switcher-card">
        <CardContent className="p-4">
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
});

export { ModeSwitcher };
export default ModeSwitcher;