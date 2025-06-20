/**
 * OneDrive Cloud Database Manager Component
 * Admin interface for managing hybrid cloud storage architecture
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Cloud, 
  Database, 
  Sync, 
  Shield, 
  BarChart3, 
  FileText, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Activity,
  HardDrive,
  Zap
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

interface StorageHealth {
  tenantId: string;
  totalFiles: number;
  syncedFiles: number;
  errorFiles: number;
  totalSize: number;
  healthScore: number;
  lastSync: string;
}

interface StorageRecord {
  id: string;
  fileType: string;
  entityId: string;
  fileName: string;
  fileSize: number;
  syncStatus: string;
  classificationLevel: string;
  createdAt: string;
  lastSyncAt: string;
}

interface StorageStatistics {
  totalTenants: number;
  totalFiles: number;
  totalSize: number;
  byFileType: Record<string, number>;
  byClassification: Record<string, number>;
  syncHealth: {
    synced: number;
    pending: number;
    error: number;
  };
}

export default function OneDriveCloudManager() {
  const { currentTenant, isAdmin } = useTenant();
  const [activeTab, setActiveTab] = useState('overview');
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
  const [storageRecords, setStorageRecords] = useState<StorageRecord[]>([]);
  const [statistics, setStatistics] = useState<StorageStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  useEffect(() => {
    if (currentTenant && isAdmin) {
      loadStorageHealth();
      loadStorageRecords();
      if (isAdmin) loadStatistics();
      testConnection();
    }
  }, [currentTenant, isAdmin]);

  const loadStorageHealth = async () => {
    try {
      const response = await fetch('/api/onedrive-storage/health');
      if (response.ok) {
        const data = await response.json();
        setStorageHealth(data.health);
      }
    } catch (error) {
      console.error('Failed to load storage health:', error);
    }
  };

  const loadStorageRecords = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/onedrive-storage/records');
      if (response.ok) {
        const data = await response.json();
        setStorageRecords(data.records || []);
      }
    } catch (error) {
      console.error('Failed to load storage records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch('/api/onedrive-storage/admin/statistics');
      if (response.ok) {
        const data = await response.json();
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch('/api/onedrive-storage/test-connection');
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data.connectionValid ? 'connected' : 'error');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
    }
  };

  const initializeStorage = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/onedrive-storage/initialize', {
        method: 'POST'
      });
      
      if (response.ok) {
        await loadStorageHealth();
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncData = async () => {
    try {
      setSyncInProgress(true);
      const response = await fetch('/api/onedrive-storage/sync', {
        method: 'POST'
      });
      
      if (response.ok) {
        await loadStorageHealth();
        await loadStorageRecords();
      }
    } catch (error) {
      console.error('Failed to sync data:', error);
    } finally {
      setSyncInProgress(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getClassificationColor = (level: string) => {
    switch (level) {
      case 'public': return 'bg-blue-100 text-blue-800';
      case 'internal': return 'bg-orange-100 text-orange-800';
      case 'confidential': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAdmin) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Admin access required to manage OneDrive cloud storage.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OneDrive Cloud Database</h1>
          <p className="text-gray-600">Hybrid storage architecture management</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'} className="flex items-center gap-1">
            {connectionStatus === 'connected' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {connectionStatus === 'connected' ? 'Connected' : 'Connection Error'}
          </Badge>
          <Button onClick={testConnection} variant="outline" size="sm">
            Test Connection
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Button 
          onClick={initializeStorage} 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Cloud className="h-4 w-4" />
          Initialize Storage
        </Button>
        <Button 
          onClick={syncData} 
          disabled={syncInProgress}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Sync className={`h-4 w-4 ${syncInProgress ? 'animate-spin' : ''}`} />
          Sync Data
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="records">Storage Records</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Storage Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {storageHealth?.healthScore ? `${storageHealth.healthScore.toFixed(1)}%` : 'N/A'}
                </div>
                <div className="mt-2">
                  <Progress value={storageHealth?.healthScore || 0} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {storageHealth?.syncedFiles || 0} of {storageHealth?.totalFiles || 0} files synced
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {storageHealth?.totalSize ? formatFileSize(storageHealth.totalSize) : '0 B'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {storageHealth?.totalFiles || 0} files stored
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {storageHealth?.errorFiles === 0 ? 'Healthy' : `${storageHealth?.errorFiles} Errors`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last sync: {storageHealth?.lastSync ? new Date(storageHealth.lastSync).toLocaleString() : 'Never'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* File Type Distribution */}
          {statistics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  File Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(statistics.byFileType).map(([type, count]) => (
                    <div key={type} className="text-center">
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="records" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Storage Records ({storageRecords.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading storage records...</div>
              ) : storageRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No storage records found. Initialize storage to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {storageRecords.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{record.fileName}</span>
                          <Badge className={getStatusColor(record.syncStatus)}>
                            {record.syncStatus}
                          </Badge>
                          <Badge className={getClassificationColor(record.classificationLevel)}>
                            {record.classificationLevel}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Type: {record.fileType.replace('_', ' ')} • Size: {formatFileSize(record.fileSize)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created: {new Date(record.createdAt).toLocaleString()} • 
                          Last Sync: {new Date(record.lastSyncAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          {statistics && (
            <>
              {/* Platform-wide Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statistics.totalTenants}</div>
                    <p className="text-xs text-muted-foreground">Using OneDrive storage</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Files</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statistics.totalFiles}</div>
                    <p className="text-xs text-muted-foreground">Across all tenants</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatFileSize(statistics.totalSize)}</div>
                    <p className="text-xs text-muted-foreground">OneDrive usage</p>
                  </CardContent>
                </Card>
              </div>

              {/* Sync Health Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Sync Health Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{statistics.syncHealth.synced}</div>
                      <div className="text-sm text-gray-600">Synced</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{statistics.syncHealth.pending}</div>
                      <div className="text-sm text-gray-600">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{statistics.syncHealth.error}</div>
                      <div className="text-sm text-gray-600">Errors</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Classification */}
              <Card>
                <CardHeader>
                  <CardTitle>Data Classification</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(statistics.byClassification).map(([level, count]) => (
                      <div key={level} className="text-center">
                        <div className="text-2xl font-bold">{count}</div>
                        <Badge className={getClassificationColor(level)}>
                          {level}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cloud Storage Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  OneDrive cloud database architecture provides hybrid storage for tenant data feeds. 
                  Essential metadata remains in PostgreSQL while documents and analytics are stored in OneDrive.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Storage Strategy</h4>
                  <p className="text-sm text-gray-600">
                    Files under 4MB use direct upload, larger files use chunked upload sessions.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Data Classification</h4>
                  <p className="text-sm text-gray-600">
                    All data is automatically classified as public, internal, or confidential based on content type.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Sync Frequency</h4>
                  <p className="text-sm text-gray-600">
                    Data is synchronized between PostgreSQL and OneDrive every 15 minutes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}