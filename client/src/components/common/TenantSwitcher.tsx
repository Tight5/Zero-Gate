/**
 * TenantSwitcher Component
 * Enhanced tenant switching with comprehensive organizational context
 * Implements attached asset specifications for seamless tenant management
 */

import React, { useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { useTenantStats, useTenantSettings, useTenantSubscription } from '../../hooks/useTenantData';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Building2, Users, Target, DollarSign, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface TenantInfo {
  id: string;
  name: string;
  domain: string;
  role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  lastAccess: string;
  subscription: {
    plan: string;
    status: string;
    expiresAt?: string;
  };
  stats: {
    users: number;
    sponsors: number;
    grants: number;
    funding: number;
  };
}

const TenantSwitcher: React.FC = () => {
  const { currentTenant, availableTenants, switchTenant } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const { data: stats } = useTenantStats();
  const { settings } = useTenantSettings();
  const { data: subscription } = useTenantSubscription();

  // Mock available tenants with comprehensive data
  const tenantOptions: TenantInfo[] = [
    {
      id: 'nasdaq-center',
      name: 'NASDAQ Entrepreneurial Center',
      domain: 'thecenter.nasdaq.org',
      role: 'owner',
      status: 'active',
      lastAccess: '2025-06-20T17:30:00Z',
      subscription: {
        plan: 'Enterprise',
        status: 'active',
        expiresAt: '2025-12-31T23:59:59Z'
      },
      stats: {
        users: 45,
        sponsors: 45,
        grants: 12,
        funding: 2150000
      }
    },
    {
      id: 'tight5-digital',
      name: 'Tight5 Digital (Admin)',
      domain: 'tight5digital.com',
      role: 'admin',
      status: 'active',
      lastAccess: '2025-06-20T16:45:00Z',
      subscription: {
        plan: 'Developer',
        status: 'active'
      },
      stats: {
        users: 8,
        sponsors: 15,
        grants: 3,
        funding: 450000
      }
    },
    {
      id: 'innovation-hub',
      name: 'Innovation Hub Collective',
      domain: 'innovationhub.org',
      role: 'manager',
      status: 'active',
      lastAccess: '2025-06-19T14:20:00Z',
      subscription: {
        plan: 'Professional',
        status: 'active'
      },
      stats: {
        users: 23,
        sponsors: 28,
        grants: 7,
        funding: 890000
      }
    }
  ];

  const handleTenantSwitch = async (tenantId: string) => {
    try {
      await switchTenant(tenantId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch tenant:', error);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'member': return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'suspended': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 max-w-[200px]">
          <Building2 className="h-4 w-4" />
          <span className="truncate">
            {currentTenant?.name || 'Select Organization'}
          </span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Switch Organization
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {tenantOptions.map((tenant) => (
            <Card 
              key={tenant.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                currentTenant?.id === tenant.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => handleTenantSwitch(tenant.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      {tenant.name}
                      {getStatusIcon(tenant.status)}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{tenant.domain}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={getRoleColor(tenant.role)}>
                      {tenant.role.charAt(0).toUpperCase() + tenant.role.slice(1)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {tenant.subscription.plan}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">{tenant.stats.users}</p>
                      <p className="text-xs text-gray-600">Users</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">{tenant.stats.sponsors}</p>
                      <p className="text-xs text-gray-600">Sponsors</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium">{tenant.stats.grants}</p>
                      <p className="text-xs text-gray-600">Grants</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(tenant.stats.funding)}</p>
                      <p className="text-xs text-gray-600">Funding</p>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-3" />
                
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Last accessed: {formatDate(tenant.lastAccess)}</span>
                  {tenant.subscription.expiresAt && (
                    <span>Expires: {formatDate(tenant.subscription.expiresAt)}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Current Organization Features</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {settings?.features?.slice(0, 6).map((feature: string) => (
              <div key={feature} className="flex items-center gap-2 text-blue-800">
                <CheckCircle className="h-3 w-3" />
                <span className="capitalize">{feature.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TenantSwitcher;