import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';

const TenantSelection = () => {
  const [selectedTenant, setSelectedTenant] = useState(null);
  const { user, logout } = useAuth();
  const { availableTenants, switchTenant, loading, currentTenant } = useTenant();

  // Redirect if tenant is already selected
  if (currentTenant) {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect if no tenants available
  if (!loading && availableTenants.length === 0) {
    return <Navigate to="/no-access" replace />;
  }

  const handleTenantSelect = (tenant) => {
    setSelectedTenant(tenant);
  };

  const handleContinue = () => {
    if (selectedTenant) {
      switchTenant(selectedTenant.id);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      owner: 'purple',
      admin: 'blue',
      manager: 'green',
      user: 'gray',
      viewer: 'orange'
    };
    return colors[role] || 'gray';
  };

  if (loading) {
    return (
      <div className="tenant-selection-page min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="selection-container max-w-md w-full mx-4">
          <Card className="loading-card p-8">
            <div className="loading-content text-center">
              <div className="loading-spinner animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading your organizations...</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="tenant-selection-page min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="selection-container max-w-4xl mx-auto px-4">
        <Card className="selection-card p-8">
          <div className="selection-header flex items-center justify-between mb-8">
            <div className="user-info flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={user?.profileImageUrl}
                  alt={user?.firstName || user?.name}
                />
                <AvatarFallback className="text-lg bg-blue-100 text-blue-800">
                  {user?.firstName?.[0] || user?.name?.[0] || user?.email?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="user-details">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Welcome, {user?.firstName || user?.name || 'User'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">Select an organization to continue</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              onClick={logout}
              className="logout-button text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>

          <div className="tenants-list">
            <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Your Organizations</h3>
            <div className="tenants-grid grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableTenants.map((tenant) => (
                <Card
                  key={tenant.id}
                  className={`tenant-card cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                    selectedTenant?.id === tenant.id
                      ? 'selected border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }`}
                  onClick={() => handleTenantSelect(tenant)}
                >
                  <div className="tenant-content p-6">
                    <div className="flex items-start space-x-4">
                      <div className="tenant-icon p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <Building2 className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                      </div>
                      
                      <div className="tenant-info flex-1 min-w-0">
                        <h4 className="tenant-name text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                          {tenant.name}
                        </h4>
                        <p className="tenant-description text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {tenant.description || 'Entrepreneur Support Organization'}
                        </p>
                        
                        <div className="tenant-meta flex items-center justify-between mt-4">
                          <div className="tenant-role">
                            <Badge 
                              className={`
                                ${getRoleColor(tenant.role) === 'purple' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : ''}
                                ${getRoleColor(tenant.role) === 'blue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}
                                ${getRoleColor(tenant.role) === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                                ${getRoleColor(tenant.role) === 'gray' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' : ''}
                                ${getRoleColor(tenant.role) === 'orange' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' : ''}
                              `}
                            >
                              {tenant.role}
                            </Badge>
                          </div>
                          
                          <div className="tenant-stats">
                            <div className="stat-item flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Users className="h-4 w-4 mr-1" />
                              <span>{tenant.userCount || 0} members</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="tenant-arrow">
                        <ChevronRight className={`h-5 w-5 transition-colors ${
                          selectedTenant?.id === tenant.id 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} />
                      </div>
                    </div>
                    
                    {tenant.status !== 'active' && (
                      <div className="tenant-status mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Badge variant="secondary" className={`status-indicator text-xs ${tenant.status}`}>
                          {tenant.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="selection-actions flex justify-center mt-8">
            <Button
              onClick={handleContinue}
              disabled={!selectedTenant || selectedTenant.status !== 'active'}
              className="continue-button min-w-[250px] h-12 text-base"
            >
              Continue to {selectedTenant?.name || 'Organization'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>

        <div className="selection-help mt-8">
          <Card className="help-card p-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Need Help?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              If you don't see your organization listed, you may need to:
            </p>
            <ul className="text-gray-600 dark:text-gray-400 space-y-2 list-disc list-inside mb-6">
              <li>Contact your organization administrator for access</li>
              <li>Verify your email address matches your organization's domain</li>
              <li>Check if your account needs approval</li>
            </ul>
            <Button variant="outline" size="sm">
              Contact Support
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TenantSelection;