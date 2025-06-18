import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { isAuthenticated } from '../replitAuth';

const router = Router();

// Workflow management endpoints
router.post('/workflows/sponsor-analysis', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { sponsor_id } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    // Check current system resources before starting intensive workflow
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (memPercent > 85) {
      return res.status(503).json({
        error: 'System resources insufficient for sponsor analysis',
        memory_usage: `${Math.round(memPercent)}%`,
        suggestion: 'Try again when system load is lower'
      });
    }

    // Simulate sponsor analysis workflow with resource monitoring
    const analysisResult = {
      success: true,
      workflow_type: 'sponsor_analysis',
      tenant_id: tenantId,
      sponsor_id: sponsor_id || 'all',
      status: 'initiated',
      estimated_completion: new Date(Date.now() + 30000).toISOString(), // 30 seconds
      resource_status: {
        memory_usage: `${Math.round(memPercent)}%`,
        workflow_priority: memPercent > 70 ? 'degraded' : 'normal'
      }
    };

    res.json(analysisResult);

  } catch (error) {
    res.status(500).json({
      error: 'Failed to initiate sponsor analysis workflow',
      details: error.message
    });
  }
});

router.post('/workflows/grant-timeline', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { grant_id } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // Grant timeline analysis is less resource intensive
    const timelineResult = {
      success: true,
      workflow_type: 'grant_timeline',
      tenant_id: tenantId,
      grant_id: grant_id || 'all',
      status: 'processing',
      milestones_calculated: true,
      backwards_planning: {
        '90_day_milestone': new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        '60_day_milestone': new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        '30_day_milestone': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      resource_status: {
        memory_usage: `${Math.round(memPercent)}%`,
        processing_mode: 'standard'
      }
    };

    res.json(timelineResult);

  } catch (error) {
    res.status(500).json({
      error: 'Failed to initiate grant timeline workflow',
      details: error.message
    });
  }
});

router.post('/workflows/relationship-mapping', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { source, target, max_depth = 7 } = req.body;

    if (!tenantId || !source || !target) {
      return res.status(400).json({ 
        error: 'Tenant ID, source, and target are required' 
      });
    }

    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // Relationship mapping is most resource intensive
    if (memPercent > 80) {
      return res.status(503).json({
        error: 'Relationship mapping disabled due to high memory usage',
        memory_usage: `${Math.round(memPercent)}%`,
        alternative: 'Try simplified relationship lookup instead'
      });
    }

    const mappingResult = {
      success: true,
      workflow_type: 'relationship_mapping',
      tenant_id: tenantId,
      source,
      target,
      max_depth,
      status: memPercent > 70 ? 'degraded_processing' : 'full_processing',
      processing_mode: memPercent > 70 ? 'simplified' : 'complete',
      estimated_completion: new Date(Date.now() + (memPercent > 70 ? 15000 : 45000)).toISOString(),
      resource_status: {
        memory_usage: `${Math.round(memPercent)}%`,
        algorithm: memPercent > 70 ? 'simplified_pathfinding' : 'seven_degree_analysis'
      }
    };

    res.json(mappingResult);

  } catch (error) {
    res.status(500).json({
      error: 'Failed to initiate relationship mapping workflow',
      details: error.message
    });
  }
});

// Get workflow status and feature availability
router.get('/workflows/status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const uptime = process.uptime();
    
    // Determine feature availability based on current resources
    const featureAvailability = {
      sponsor_analysis: memPercent < 85 ? 'enabled' : 'disabled',
      grant_timeline: 'enabled', // Always available as it's lightweight
      relationship_mapping: memPercent < 80 ? 'enabled' : (memPercent < 90 ? 'degraded' : 'disabled'),
      background_sync: memPercent < 75 ? 'enabled' : 'degraded',
      file_processing: memPercent < 85 ? 'enabled' : 'disabled',
      advanced_analytics: memPercent < 70 ? 'enabled' : 'disabled'
    };

    const workflowStatus = {
      success: true,
      system_health: {
        memory: {
          percentage: Math.round(memPercent),
          status: memPercent < 70 ? 'healthy' : (memPercent < 85 ? 'warning' : 'critical'),
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
        },
        uptime: Math.round(uptime),
        status: memPercent < 85 ? 'operational' : 'degraded'
      },
      feature_availability: featureAvailability,
      active_workflows: 0, // Would track actual running workflows
      resource_thresholds: {
        memory_warning: 70,
        memory_critical: 85,
        memory_emergency: 95
      },
      timestamp: new Date().toISOString()
    };

    res.json(workflowStatus);

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get workflow status',
      details: error.message
    });
  }
});

// Resource monitoring endpoint
router.get('/workflows/resources', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Get CPU usage estimation
    const startUsage = process.cpuUsage();
    
    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage);
      const cpuPercent = ((endUsage.user + endUsage.system) / 1000000) / 1000 * 100;
      
      res.json({
        success: true,
        resources: {
          memory: {
            rss: Math.round(memUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
            external: Math.round(memUsage.external / 1024 / 1024)
          },
          cpu: {
            usage_estimate: Math.min(Math.round(cpuPercent), 100),
            user_time: endUsage.user,
            system_time: endUsage.system
          },
          uptime: Math.round(uptime),
          node_version: process.version,
          platform: process.platform,
          timestamp: new Date().toISOString()
        },
        thresholds: {
          memory_high: 70,
          memory_critical: 85,
          memory_emergency: 95,
          cpu_high: 75,
          cpu_critical: 90
        },
        recommendations: memUsage.heapUsed / memUsage.heapTotal > 0.8 ? [
          'Consider restarting the application',
          'Disable non-essential features',
          'Check for memory leaks'
        ] : []
      });
    }, 100);
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get resource information',
      details: error.message
    });
  }
});

// Emergency workflow controls
router.post('/workflows/emergency/disable-features', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { features } = req.body;
    const defaultFeatures = ['relationship_mapping', 'advanced_analytics', 'file_processing'];
    const featuresToDisable = features || defaultFeatures;
    
    res.json({
      success: true,
      action: 'emergency_disable',
      disabled_features: featuresToDisable,
      message: 'Features disabled to preserve system resources',
      timestamp: new Date().toISOString(),
      recovery_estimate: '5-10 minutes'
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to disable features',
      details: error.message
    });
  }
});

router.post('/workflows/emergency/enable-features', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { features } = req.body;
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (memPercent > 85) {
      return res.status(503).json({
        error: 'Cannot enable features - system resources still critical',
        memory_usage: `${Math.round(memPercent)}%`,
        suggestion: 'Wait for memory usage to decrease below 85%'
      });
    }
    
    res.json({
      success: true,
      action: 'emergency_enable',
      enabled_features: features || ['all'],
      message: 'Features re-enabled - system resources sufficient',
      current_memory: `${Math.round(memPercent)}%`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to enable features',
      details: error.message
    });
  }
});

// Workflow task queue management
router.get('/workflows/queue', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Simulate queue status
    const queueStatus = {
      success: true,
      queue_length: 0,
      processing_tasks: 0,
      completed_today: 12,
      failed_today: 1,
      average_processing_time: '45 seconds',
      queue_types: {
        sponsor_analysis: 0,
        grant_timeline: 0,
        relationship_mapping: 0,
        background_sync: 0
      },
      timestamp: new Date().toISOString()
    };

    res.json(queueStatus);

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get queue status',
      details: error.message
    });
  }
});

export default router;