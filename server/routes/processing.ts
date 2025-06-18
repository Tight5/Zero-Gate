/**
 * ProcessingAgent API Routes - NetworkX Integration
 * Provides endpoints for relationship graph processing, sponsor metrics, and grant timelines
 */

import { Router } from 'express';
import { spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { isAuthenticated } from '../replitAuth';

const router = Router();

interface ProcessingRequest {
  action: string;
  data: any;
  tenant_id: string;
}

interface ProcessingResponse {
  success: boolean;
  data?: any;
  error?: string;
  processing_time_ms?: number;
}

/**
 * Execute Python processing agent command
 */
async function executeProcessingAgent(request: ProcessingRequest): Promise<ProcessingResponse> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const pythonScript = path.join(__dirname, '../agents/processing_wrapper.py');
    
    const child = spawn('python3', [pythonScript], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const processingTime = Date.now() - startTime;
      
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve({
            success: true,
            data: result,
            processing_time_ms: processingTime
          });
        } catch (error) {
          resolve({
            success: false,
            error: `Failed to parse response: ${error}`,
            processing_time_ms: processingTime
          });
        }
      } else {
        resolve({
          success: false,
          error: stderr || `Process exited with code ${code}`,
          processing_time_ms: processingTime
        });
      }
    });

    // Send request data to Python process
    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();
  });
}

/**
 * Add sponsor to relationship graph
 */
router.post('/sponsors', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const sponsorData = req.body;
    const processingRequest: ProcessingRequest = {
      action: 'add_sponsor',
      data: { ...sponsorData, tenant_id: tenantId },
      tenant_id: tenantId
    };

    const result = await executeProcessingAgent(processingRequest);
    
    if (result.success) {
      res.json({
        success: true,
        sponsor_id: sponsorData.id,
        message: 'Sponsor added to relationship graph',
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error adding sponsor to graph:', error);
    res.status(500).json({ error: 'Failed to add sponsor to relationship graph' });
  }
});

/**
 * Add relationship edge to graph
 */
router.post('/relationships', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const relationshipData = req.body;
    const processingRequest: ProcessingRequest = {
      action: 'add_relationship',
      data: { ...relationshipData, tenant_id: tenantId },
      tenant_id: tenantId
    };

    const result = await executeProcessingAgent(processingRequest);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Relationship added to graph',
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error adding relationship to graph:', error);
    res.status(500).json({ error: 'Failed to add relationship to graph' });
  }
});

/**
 * Find shortest path between nodes (up to 7 degrees)
 */
router.post('/path-discovery', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const { source, target, max_length = 7 } = req.body;
    
    if (!source || !target) {
      return res.status(400).json({ error: 'Source and target nodes required' });
    }

    const processingRequest: ProcessingRequest = {
      action: 'find_shortest_path',
      data: { source, target, max_length, tenant_id: tenantId },
      tenant_id: tenantId
    };

    const result = await executeProcessingAgent(processingRequest);
    
    if (result.success) {
      res.json({
        success: true,
        path_result: result.data,
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error finding path:', error);
    res.status(500).json({ error: 'Failed to find relationship path' });
  }
});

/**
 * Find multiple paths between nodes
 */
router.post('/multiple-paths', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const { source, target, k = 3 } = req.body;
    
    if (!source || !target) {
      return res.status(400).json({ error: 'Source and target nodes required' });
    }

    const processingRequest: ProcessingRequest = {
      action: 'find_multiple_paths',
      data: { source, target, k, tenant_id: tenantId },
      tenant_id: tenantId
    };

    const result = await executeProcessingAgent(processingRequest);
    
    if (result.success) {
      res.json({
        success: true,
        paths: result.data,
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error finding multiple paths:', error);
    res.status(500).json({ error: 'Failed to find multiple relationship paths' });
  }
});

/**
 * Calculate sponsor metrics
 */
router.get('/sponsors/:id/metrics', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const sponsorId = req.params.id;
    const processingRequest: ProcessingRequest = {
      action: 'calculate_sponsor_metrics',
      data: { sponsor_id: sponsorId, tenant_id: tenantId },
      tenant_id: tenantId
    };

    const result = await executeProcessingAgent(processingRequest);
    
    if (result.success) {
      res.json({
        success: true,
        metrics: result.data,
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error calculating sponsor metrics:', error);
    res.status(500).json({ error: 'Failed to calculate sponsor metrics' });
  }
});

/**
 * Generate grant timeline with backwards planning
 */
router.post('/grant-timeline', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const grantData = req.body;
    const processingRequest: ProcessingRequest = {
      action: 'generate_grant_timeline',
      data: { ...grantData, tenant_id: tenantId },
      tenant_id: tenantId
    };

    const result = await executeProcessingAgent(processingRequest);
    
    if (result.success) {
      res.json({
        success: true,
        timeline: result.data,
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error generating grant timeline:', error);
    res.status(500).json({ error: 'Failed to generate grant timeline' });
  }
});

/**
 * Get network statistics
 */
router.get('/network/stats', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const processingRequest: ProcessingRequest = {
      action: 'get_network_statistics',
      data: { tenant_id: tenantId },
      tenant_id: tenantId
    };

    const result = await executeProcessingAgent(processingRequest);
    
    if (result.success) {
      res.json({
        success: true,
        statistics: result.data,
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error getting network statistics:', error);
    res.status(500).json({ error: 'Failed to get network statistics' });
  }
});

/**
 * Estimate distance between nodes using landmarks
 */
router.post('/distance-estimate', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const { source, target } = req.body;
    
    if (!source || !target) {
      return res.status(400).json({ error: 'Source and target nodes required' });
    }

    const processingRequest: ProcessingRequest = {
      action: 'estimate_distance',
      data: { source, target, tenant_id: tenantId },
      tenant_id: tenantId
    };

    const result = await executeProcessingAgent(processingRequest);
    
    if (result.success) {
      res.json({
        success: true,
        estimated_distance: result.data,
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error estimating distance:', error);
    res.status(500).json({ error: 'Failed to estimate distance' });
  }
});

export default router;