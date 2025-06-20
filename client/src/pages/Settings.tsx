import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, User, Building, Palette, Bell, Shield, LogOut } from 'lucide-react';

export default function Settings() {
  const { user, isAuthenticated } = useAuth();
  const [theme, setTheme] = useState('system');
  const [notifications, setNotifications] = useState(true);
  
  // Mock data for development
  const currentTenant = { 
    name: 'NASDAQ Center', 
    id: 'nasdaq-center',
    domain: 'nasdaq-center.org',
    features: ['grants', 'relationships', 'analytics', 'content-calendar']
  };
  
  const availableTenants = [
    { id: 'nasdaq-center', name: 'NASDAQ Center', role: 'admin', domain: 'nasdaq-center.org' },
    { id: 'tight5-digital', name: 'Tight5 Digital', role: 'owner', domain: 'tight5digital.com' }
  ];
  
  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const handleSwitchTenant = (tenantId: string) => {
    console.log('Switching to tenant:', tenantId);
    // In a real app, this would make an API call
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    // Apply theme to document
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account and application preferences</p>
          </div>
        </div>

        {/* User Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Profile
            </CardTitle>
            <CardDescription>Your account information and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {user?.profileImageUrl && (
                <img
                  src={user.profileImageUrl}
                  alt="Profile"
                  className="h-16 w-16 rounded-full object-cover"
                />
              )}
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user?.email || 'User'
                  }
                </h3>
                <p className="text-sm text-muted-foreground">{user?.email || 'No email available'}</p>
                <Badge variant="outline">
                  {isAuthenticated ? 'Authenticated' : 'Guest'}
                </Badge>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Account Actions</p>
                <p className="text-sm text-muted-foreground">Manage your session and account</p>
              </div>
              <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tenant Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Organization Management
            </CardTitle>
            <CardDescription>Switch between organizations and manage tenant settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Current Organization</Label>
                <div className="mt-2 p-3 border rounded-lg">
                  <h4 className="font-semibold">{currentTenant.name}</h4>
                  <p className="text-sm text-muted-foreground">{currentTenant.domain}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {currentTenant.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              {availableTenants.length > 1 && (
                <div>
                  <Label className="text-sm font-medium">Available Organizations</Label>
                  <div className="mt-2 space-y-2">
                    {availableTenants
                      .filter(tenant => tenant.id !== currentTenant?.id)
                      .map((tenant) => (
                        <div
                          key={tenant.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
                          onClick={() => handleSwitchTenant(tenant.id)}
                        >
                          <div>
                            <h5 className="font-medium">{tenant.name}</h5>
                            <p className="text-sm text-muted-foreground">{tenant.domain}</p>
                          </div>
                          <Button variant="ghost" size="sm">Switch</Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel of the application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Theme</Label>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('light')}
                >
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('dark')}
                >
                  Dark
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('system')}
                >
                  System
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about grants, deadlines, and platform updates
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive browser notifications for important updates
                </p>
              </div>
              <Switch id="push-notifications" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="milestone-alerts">Milestone Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about upcoming grant milestones and deadlines
                </p>
              </div>
              <Switch id="milestone-alerts" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Privacy
            </CardTitle>
            <CardDescription>Manage your security preferences and data privacy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Connected Services</Label>
                <p className="text-sm text-muted-foreground">
                  Manage connected Microsoft 365 and other integrations
                </p>
              </div>
              <Button variant="outline" size="sm">
                Manage
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Data Export</Label>
                <p className="text-sm text-muted-foreground">
                  Download your data and activity history
                </p>
              </div>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}