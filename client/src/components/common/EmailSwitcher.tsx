import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserIcon, ShieldIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const EmailSwitcher: React.FC = React.memo(() => {
  const [currentEmail, setCurrentEmail] = useState(() => 
    localStorage.getItem('userEmail') || 'clint.phillips@thecenter.nasdaq.org'
  );
  const [isSwitching, setIsSwitching] = useState(false);
  const { toast } = useToast();

  const emails = [
    {
      email: 'clint.phillips@thecenter.nasdaq.org',
      name: 'Clint Phillips',
      role: 'Tenant User',
      icon: UserIcon,
      isAdmin: false,
    },
    {
      email: 'admin@tight5digital.com',
      name: 'Admin User',
      role: 'System Admin',
      icon: ShieldIcon,
      isAdmin: true,
    },
  ];

  const handleEmailSwitch = async (email: string) => {
    if (isSwitching || email === currentEmail) return;

    setIsSwitching(true);
    try {
      const response = await fetch('/api/auth/switch-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to switch email');
      }

      const data = await response.json();
      
      // Update localStorage
      localStorage.setItem('userEmail', email);
      
      // Clear admin mode and tenant context when switching users
      localStorage.setItem('isAdminMode', 'false');
      localStorage.removeItem('currentTenantId');
      localStorage.removeItem('selectedTenant');
      
      setCurrentEmail(email);
      
      toast({
        title: 'Email Switched',
        description: `Now authenticated as ${email}`,
        variant: 'default',
      });

      // Reload the page to refresh all contexts
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch email:', error);
      toast({
        title: 'Switch Failed',
        description: error instanceof Error ? error.message : 'Failed to switch email',
        variant: 'destructive',
      });
    } finally {
      setIsSwitching(false);
    }
  };

  const currentEmailData = emails.find(e => e.email === currentEmail) || emails[0];
  const CurrentIcon = currentEmailData.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center space-x-2"
          disabled={isSwitching}
        >
          <CurrentIcon className="w-4 h-4" />
          <span className="hidden md:inline">
            {currentEmailData.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-2 py-2">
          <p className="text-sm font-medium">Switch User Context</p>
          <p className="text-xs text-muted-foreground">
            Change between tenant and admin mode
          </p>
        </div>
        
        <DropdownMenuSeparator />
        
        {emails.map((emailData) => {
          const Icon = emailData.icon;
          const isActive = emailData.email === currentEmail;
          
          return (
            <DropdownMenuItem
              key={emailData.email}
              onClick={() => handleEmailSwitch(emailData.email)}
              disabled={isActive || isSwitching}
              className={`px-3 py-3 cursor-pointer ${
                isActive ? 'bg-muted/50' : ''
              }`}
            >
              <div className="flex items-start space-x-3 w-full">
                <div className={`p-2 rounded-full ${
                  emailData.isAdmin 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {emailData.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {emailData.email}
                  </p>
                  <p className={`text-xs font-medium mt-1 ${
                    emailData.isAdmin ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {emailData.role} {isActive && '(Current)'}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        
        <div className="px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Switching will reload the page and clear current session context
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

EmailSwitcher.displayName = 'EmailSwitcher';

export default EmailSwitcher;