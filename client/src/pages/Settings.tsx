import React from 'react';
import { useTheme, useAuth, useTenant } from '../hooks/useContexts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, User, Building, Palette, Bell, Shield, LogOut } from 'lucide-react';

export default function Settings() {
  const { user, logout } = useAuth();
  const { currentTenant, switchTenant, availableTenants } = useTenant();
  const { theme, setTheme, actualTheme } = useTheme();

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
              <div>
                <h3 className="font-semibold">{user?.firstName} {user?.lastName}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge variant="secondary" className="mt-1">User ID: {user?.id}</Badge>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Account Actions</p>
                <p className="text-sm text-muted-foreground">Manage your session and account</p>
              </div>
              <Button onClick={logout} variant="outline" className="flex items-center gap-2">
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
                {currentTenant && (
                  <div className="mt-2 p-3 border rounded-lg">
                    <h4 className="font-semibold">{currentTenant.name}</h4>
                    <p className="text-sm text-muted-foreground">{currentTenant.domain}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {currentTenant.settings.features.map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
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
                          onClick={() => switchTenant(tenant.id)}
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
            <CardDescription>Customize the look and feel of your application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Theme Preference</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Current theme: {actualTheme} {theme === 'system' && '(following system)'}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                  >
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                  >
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('system')}
                  >
                    System
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure how you receive updates and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email updates for important events</p>
                </div>
                <Switch id="email-notifications" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="system-alerts">System Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified about system status changes</p>
                </div>
                <Switch id="system-alerts" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="grant-updates">Grant Updates</Label>
                  <p className="text-sm text-muted-foreground">Notifications for grant milestone changes</p>
                </div>
                <Switch id="grant-updates" defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Privacy
            </CardTitle>
            <CardDescription>Manage your security settings and data privacy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Session Management</Label>
                  <p className="text-sm text-muted-foreground">Automatically sign out after inactivity</p>
                </div>
                <Badge variant="outline">30 minutes</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Data Export</Label>
                  <p className="text-sm text-muted-foreground">Download your account data</p>
                </div>
                <Button variant="outline" size="sm">Export Data</Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Activity Log</Label>
                  <p className="text-sm text-muted-foreground">View your recent account activity</p>
                </div>
                <Button variant="outline" size="sm">View Log</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}