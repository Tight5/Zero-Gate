import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PlayCircle, 
  PauseCircle, 
  StopCircle, 
  Settings, 
  Activity, 
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Cpu,
  HardDrive,
  Zap
} from 'lucide-react';

interface OrchestrationStatus {
  agent_status: string;
  uptime: number;
  active_workflows: number;
  completed_today: number;
  resource_health: string;
  enabled_features: Record<string, boolean>;
  current_load: {
    cpu_percent: number;
    memory_percent: number;
    queue_size: number;
  };
}

interface WorkflowTask {
  id: string;
  name: string;
  status: string;
  progress: number;
  workflow_type: string;
  priority: string;
  created_at: string;
  estimated_completion?: string;
}

const OrchestrationDashboard: React.FC = () => {
  const [status, setStatus] = useState<OrchestrationStatus | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState('balanced');

  useEffect(() => {
    fetchOrchestrationStatus();
    fetchActiveWorkflows();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchOrchestrationStatus();
      fetchActiveWorkflows();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchOrchestrationStatus = async () => {
    try {
      const response = await fetch('/api/orchestration/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch orchestration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows/queue');
      const data = await response.json();
      
      // Mock workflow data for demonstration
      setWorkflows([
        {
          id: 'wf-001',
          name: 'Sponsor Analysis: Microsoft Foundation',
          status: 'running',
          progress: 65,
          workflow_type: 'sponsor_analysis',
          priority: 'high',
          created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          estimated_completion: new Date(Date.now() + 2 * 60 * 1000).toISOString()
        },
        {
          id: 'wf-002',
          name: 'Grant Timeline: Innovation Fund 2025',
          status: 'pending',
          progress: 0,
          workflow_type: 'grant_timeline',
          priority: 'medium',
          created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString()
        },
        {
          id: 'wf-003',
          name: 'Relationship Mapping: Network Analysis',
          status: 'completed',
          progress: 100,
          workflow_type: 'relationship_mapping',
          priority: 'medium',
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }
  };

  const submitWorkflow = async (workflowType: string, payload: any) => {
    try {
      const response = await fetch('/api/workflows/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_type: workflowType,
          tenant_id: 'nasdaq-center',
          payload,
          priority: 'medium'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        fetchActiveWorkflows();
      }
    } catch (error) {
      console.error('Failed to submit workflow:', error);
    }
  };

  const emergencyControl = async (action: string) => {
    try {
      const response = await fetch(`/api/workflows/emergency/${action}`, {
        method: 'POST'
      });
      
      const result = await response.json();
      if (result.success) {
        fetchOrchestrationStatus();
      }
    } catch (error) {
      console.error('Failed to execute emergency control:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <PlayCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Workflow Orchestration</h1>
          <p className="text-gray-600">Intelligent workflow management and resource monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => emergencyControl('pause_all')}
            className="flex items-center gap-2"
          >
            <PauseCircle className="h-4 w-4" />
            Pause All
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => emergencyControl('stop_agent')}
            className="flex items-center gap-2"
          >
            <StopCircle className="h-4 w-4" />
            Emergency Stop
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agent Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant={status?.agent_status === 'running' ? 'default' : 'destructive'}>
                {status?.agent_status || 'unknown'}
              </Badge>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Uptime: {status ? formatUptime(status.uptime) : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{status?.active_workflows || 0}</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed today: {status?.completed_today || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resource Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`font-medium ${getHealthColor(status?.resource_health || 'unknown')}`}>
                {status?.resource_health || 'unknown'}
              </span>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Queue: {status?.current_load?.queue_size || 0} tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Load</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>CPU</span>
                <span>{status?.current_load?.cpu_percent || 0}%</span>
              </div>
              <Progress value={status?.current_load?.cpu_percent || 0} className="h-1" />
              <div className="flex items-center justify-between text-sm">
                <span>Memory</span>
                <span>{status?.current_load?.memory_percent || 0}%</span>
              </div>
              <Progress value={status?.current_load?.memory_percent || 0} className="h-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflows">Active Workflows</TabsTrigger>
          <TabsTrigger value="features">Feature Management</TabsTrigger>
          <TabsTrigger value="submit">Submit Workflow</TabsTrigger>
          <TabsTrigger value="monitoring">Resource Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Queue</CardTitle>
              <CardDescription>Currently active and pending workflow tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(workflow.status)}
                      <div>
                        <h4 className="font-medium">{workflow.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Type: {workflow.workflow_type} • Created: {new Date(workflow.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant={getPriorityColor(workflow.priority)}>
                        {workflow.priority}
                      </Badge>
                      <div className="w-32">
                        <Progress value={workflow.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{workflow.progress}% complete</p>
                      </div>
                    </div>
                  </div>
                ))}
                {workflows.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No active workflows
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Management</CardTitle>
              <CardDescription>Control which features are enabled based on resource availability</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {status?.enabled_features && Object.entries(status.enabled_features).map(([feature, enabled]) => (
                  <div key={feature} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium capitalize">{feature.replace('_', ' ')}</h4>
                      <p className="text-sm text-muted-foreground">
                        {enabled ? 'Currently enabled' : 'Disabled due to resource constraints'}
                      </p>
                    </div>
                    <Badge variant={enabled ? 'default' : 'secondary'}>
                      {enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submit New Workflow</CardTitle>
              <CardDescription>Create and submit workflow tasks for processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button 
                  onClick={() => submitWorkflow('sponsor_analysis', { sponsor_id: 'demo-sponsor' })}
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <Activity className="h-6 w-6 mb-2" />
                  Sponsor Analysis
                </Button>
                <Button 
                  onClick={() => submitWorkflow('grant_timeline', { grant_id: 'demo-grant' })}
                  className="h-20 flex flex-col items-center justify-center"
                  variant="outline"
                >
                  <Clock className="h-6 w-6 mb-2" />
                  Grant Timeline
                </Button>
                <Button 
                  onClick={() => submitWorkflow('relationship_mapping', { 
                    source_entity: 'entity-a', 
                    target_entity: 'entity-b' 
                  })}
                  className="h-20 flex flex-col items-center justify-center"
                  variant="outline"
                >
                  <TrendingUp className="h-6 w-6 mb-2" />
                  Relationship Mapping
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  CPU Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={status?.current_load?.cpu_percent || 0} className="h-3" />
                  <p className="text-2xl font-bold">{status?.current_load?.cpu_percent || 0}%</p>
                  <p className="text-sm text-muted-foreground">
                    {(status?.current_load?.cpu_percent || 0) > 80 ? 'High usage' : 'Normal'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={status?.current_load?.memory_percent || 0} className="h-3" />
                  <p className="text-2xl font-bold">{status?.current_load?.memory_percent || 0}%</p>
                  <p className="text-sm text-muted-foreground">
                    {(status?.current_load?.memory_percent || 0) > 85 ? 'High usage' : 'Normal'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Performance Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <select 
                    value={selectedProfile} 
                    onChange={(e) => setSelectedProfile(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="development">Development</option>
                    <option value="balanced">Balanced</option>
                    <option value="performance">Performance</option>
                    <option value="emergency">Emergency</option>
                  </select>
                  <p className="text-sm text-muted-foreground">
                    Current: {selectedProfile}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrchestrationDashboard;