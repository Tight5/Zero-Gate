import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ShieldIcon, BuildingIcon } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const AdminModeToggle: React.FC = React.memo(() => {
  const { isAdminMode, isAdmin, toggleAdminMode } = useTenant();
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();

  // Only show for admin users
  if (!isAdmin) {
    return null;
  }

  const handleToggle = async () => {
    if (isToggling) return;
    
    setIsToggling(true);
    try {
      await toggleAdminMode();
      
      toast({
        title: isAdminMode ? 'Admin Mode Deactivated' : 'Admin Mode Activated',
        description: isAdminMode 
          ? 'Switched back to tenant mode' 
          : 'You now have admin access to all tenants',
        variant: isAdminMode ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Failed to toggle admin mode:', error);
      toast({
        title: 'Mode Switch Failed',
        description: error instanceof Error ? error.message : 'Failed to switch mode',
        variant: 'destructive',
      });
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2 px-3 py-2 rounded-lg border bg-background/50">
            <div className="flex items-center space-x-2">
              {isAdminMode ? (
                <ShieldIcon className="w-4 h-4 text-red-600" />
              ) : (
                <BuildingIcon className="w-4 h-4 text-blue-600" />
              )}
              
              <Label 
                htmlFor="admin-mode-toggle"
                className="text-sm font-medium cursor-pointer select-none"
              >
                {isAdminMode ? 'Admin' : 'Tenant'}
              </Label>
              
              <Switch
                id="admin-mode-toggle"
                checked={isAdminMode}
                onCheckedChange={handleToggle}
                disabled={isToggling}
                className="data-[state=checked]:bg-red-600"
              />
            </div>
          </div>
        </TooltipTrigger>
        
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="text-center">
            <p className="font-medium">
              {isAdminMode ? 'Admin Mode Active' : 'Tenant Mode Active'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isAdminMode 
                ? 'Access all tenants and admin functions. Click to return to tenant mode.'
                : 'Working within selected tenant. Click to enter admin mode for full access.'
              }
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

AdminModeToggle.displayName = 'AdminModeToggle';

export default AdminModeToggle;