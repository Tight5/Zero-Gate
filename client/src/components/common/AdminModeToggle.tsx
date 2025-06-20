import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Shield, ShieldOff, AlertTriangle } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../hooks/use-toast';

const AdminModeToggle: React.FC = React.memo(() => {
  const { isAdmin, isAdminMode, toggleAdminMode, loading } = useTenant();
  const { toast } = useToast();
  const [isToggling, setIsToggling] = useState(false);

  if (!isAdmin) return null;

  const handleToggle = async () => {
    try {
      setIsToggling(true);
      await toggleAdminMode();
      
      toast({
        title: isAdminMode ? "Exited Admin Mode" : "Entered Admin Mode",
        description: isAdminMode ? 
          "Switched back to tenant mode" : 
          "Now viewing platform as administrator",
        variant: isAdminMode ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Failed to toggle admin mode:', error);
      toast({
        title: "Failed to toggle admin mode",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="admin-mode-toggle flex items-center gap-2">
      <Button 
        variant={isAdminMode ? "destructive" : "outline"}
        size="sm"
        onClick={handleToggle}
        disabled={loading || isToggling}
        className={`transition-all duration-200 ${
          isAdminMode 
            ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' 
            : 'border-orange-500 text-orange-600 hover:bg-orange-50'
        }`}
      >
        {isAdminMode ? (
          <>
            <ShieldOff className="w-4 h-4 mr-2" />
            Exit Admin Mode
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Enter Admin Mode
          </>
        )}
      </Button>
      
      {isAdminMode && (
        <Badge 
          variant="destructive" 
          className="bg-red-100 text-red-800 border-red-300 animate-pulse"
        >
          <AlertTriangle className="w-3 h-3 mr-1" />
          ADMIN MODE
        </Badge>
      )}
    </div>
  );
});

AdminModeToggle.displayName = 'AdminModeToggle';

export default AdminModeToggle;