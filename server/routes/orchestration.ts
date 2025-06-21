/**
 * Orchestration Agent API Routes
 * Provides endpoints for memory management and feature degradation control
 * Cross-referenced with attached asset requirements for critical memory threshold management
 */

import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

const router = Router();

// Interface for orchestration status
interface OrchestrationStatus {
  agent_status: string;
  memory_status: {
    current_usage: number;
    warning_threshold: number;
    critical_threshold: number;
    emergency_threshold: number;
    degraded_features: string[];
    last_check: string;
    monitoring_enabled: boolean;
  };
  active_workflows: number;
  queue_size: number;
  enabled_features: string[];
}

// In-memory tracking for development
let orchestrationState: OrchestrationStatus = {
  agent_status: 'running',
  memory_status: {
    current_usage: 0.65, // 65% baseline
    warning_threshold: 0.75,
    critical_threshold: 0.90,
    emergency_threshold: 0.95,
    degraded_features: [],
    last_check: new Date().toISOString(),
    monitoring_enabled: true
  },
  active_workflows: 0,
  queue_size: 0,
  enabled_features: ['advanced_analytics', 'relationship_mapping', 'excel_processing']
};

/**
 * Execute Python orchestration agent command
 */
async function executePythonCommand(command: string, args: string[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      path.join(process.cwd(), 'agents', 'orchestration_wrapper.py'),
      command,
      ...args
    ]);

    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(output || '{}'));
        } catch {
          resolve({ success: true, output });
        }
      } else {
        reject(new Error(error || `Process exited with code ${code}`));
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('Python process timeout'));
    }, 10000);
  });
}

/**
 * GET /api/orchestration/status
 * Get current orchestration agent status with memory monitoring details
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Simulate realistic memory usage for development
    const memoryUsage = Math.random() * 0.25 + 0.65; // 65-90% range
    const currentTime = new Date().toISOString();
    
    orchestrationState.memory_status.current_usage = Number(memoryUsage.toFixed(3));
    orchestrationState.memory_status.last_check = currentTime;

    // Check for critical memory threshold per attached asset requirements (90%)
    if (memoryUsage >= orchestrationState.memory_status.critical_threshold) {
      const degradedFeatures = ['advanced_analytics', 'relationship_mapping', 'excel_processing'];
      orchestrationState.memory_status.degraded_features = degradedFeatures;
      orchestrationState.enabled_features = [];
    } else {
      orchestrationState.memory_status.degraded_features = [];
      orchestrationState.enabled_features = ['advanced_analytics', 'relationship_mapping', 'excel_processing'];
    }

    res.json({
      success: true,
      data: orchestrationState,
      timestamp: currentTime
    });
  } catch (error) {
    console.error('Error getting orchestration status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get orchestration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/orchestration/memory/optimize
 * Manually trigger memory optimization and feature degradation
 */
router.post('/memory/optimize', async (req: Request, res: Response) => {
  try {
    const { force = false } = req.body;
    
    // Get current memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const currentUsage = memoryUsage.heapUsed / totalMemory;
    
    orchestrationState.memory_status.current_usage = currentUsage;

    // Trigger feature degradation if above critical threshold or forced
    if (force || currentUsage >= orchestrationState.memory_status.critical_threshold) {
      const degradedFeatures = [
        'advanced_analytics',
        'relationship_mapping', 
        'excel_processing',
        'real_time_updates',
        'background_sync'
      ];

      const existingFeatures = orchestrationState.memory_status.degraded_features;
      const allFeatures = existingFeatures.concat(degradedFeatures);
      orchestrationState.memory_status.degraded_features = Array.from(new Set(allFeatures));

      // Update enabled features
      orchestrationState.enabled_features = orchestrationState.enabled_features.filter(
        feature => !orchestrationState.memory_status.degraded_features.includes(feature)
      );

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
    }

    res.json({
      success: true,
      message: 'Memory optimization triggered',
      data: {
        memory_usage_before: currentUsage,
        memory_usage_after: process.memoryUsage().heapUsed / totalMemory,
        degraded_features: orchestrationState.memory_status.degraded_features,
        enabled_features: orchestrationState.enabled_features
      }
    });
  } catch (error) {
    console.error('Error during memory optimization:', error);
    res.status(500).json({
      success: false,
      error: 'Memory optimization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/orchestration/features/recover
 * Re-enable features when memory usage returns to normal
 */
router.post('/features/recover', async (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const currentUsage = memoryUsage.heapUsed / totalMemory;
    
    orchestrationState.memory_status.current_usage = currentUsage;

    // Only recover if below warning threshold
    if (currentUsage < orchestrationState.memory_status.warning_threshold) {
      const recoveredFeatures = [...orchestrationState.memory_status.degraded_features];
      
      // Re-enable all degraded features
      orchestrationState.memory_status.degraded_features = [];
      orchestrationState.enabled_features = [
        'advanced_analytics',
        'relationship_mapping',
        'excel_processing',
        'real_time_updates',
        'background_sync',
        'detailed_logging'
      ];

      res.json({
        success: true,
        message: 'Features recovered successfully',
        data: {
          current_memory_usage: currentUsage,
          recovered_features: recoveredFeatures,
          enabled_features: orchestrationState.enabled_features
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Memory usage still above warning threshold',
        data: {
          current_usage: currentUsage,
          warning_threshold: orchestrationState.memory_status.warning_threshold
        }
      });
    }
  } catch (error) {
    console.error('Error during feature recovery:', error);
    res.status(500).json({
      success: false,
      error: 'Feature recovery failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/orchestration/submit-task
 * Submit a task to the orchestration agent
 */
router.post('/submit-task', async (req: Request, res: Response) => {
  try {
    const { type, tenant_id, ...taskData } = req.body;
    
    if (!type || !tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type and tenant_id'
      });
    }

    // Check if feature is enabled before submitting task
    const requiredFeatures: Record<string, string> = {
      'sponsor_analysis': 'advanced_analytics',
      'relationship_mapping': 'relationship_mapping',
      'excel_processing': 'excel_processing'
    };

    const requiredFeature = requiredFeatures[type];
    if (requiredFeature && !orchestrationState.enabled_features.includes(requiredFeature)) {
      return res.status(503).json({
        success: false,
        error: `Feature ${requiredFeature} is currently disabled due to resource constraints`,
        degraded_features: orchestrationState.memory_status.degraded_features
      });
    }

    const task = {
      type,
      tenant_id,
      task_id: `task_${Date.now()}`,
      submitted_at: new Date().toISOString(),
      ...taskData
    };

    orchestrationState.queue_size += 1;
    orchestrationState.active_workflows += 1;

    // Simulate task processing
    setTimeout(() => {
      orchestrationState.queue_size = Math.max(0, orchestrationState.queue_size - 1);
      orchestrationState.active_workflows = Math.max(0, orchestrationState.active_workflows - 1);
    }, 5000);

    res.json({
      success: true,
      message: 'Task submitted successfully',
      data: {
        task_id: task.task_id,
        status: 'queued',
        queue_position: orchestrationState.queue_size
      }
    });
  } catch (error) {
    console.error('Error submitting task:', error);
    res.status(500).json({
      success: false,
      error: 'Task submission failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/orchestration/health
 * Health check for orchestration agent with memory compliance validation
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const currentUsage = memoryUsage.heapUsed / totalMemory;
    
    const health = {
      status: currentUsage < orchestrationState.memory_status.critical_threshold ? 'healthy' : 'degraded',
      memory_compliance: currentUsage < orchestrationState.memory_status.critical_threshold,
      uptime: process.uptime(),
      memory_details: {
        heap_used: memoryUsage.heapUsed,
        heap_total: memoryUsage.heapTotal,
        external: memoryUsage.external,
        array_buffers: memoryUsage.arrayBuffers,
        usage_percentage: (currentUsage * 100).toFixed(2) + '%'
      },
      feature_status: {
        enabled_count: orchestrationState.enabled_features.length,
        degraded_count: orchestrationState.memory_status.degraded_features.length,
        monitoring_active: orchestrationState.memory_status.monitoring_enabled
      }
    };

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error checking orchestration health:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;