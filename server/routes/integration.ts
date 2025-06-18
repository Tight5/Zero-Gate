/**
 * IntegrationAgent API Routes - Microsoft Graph Integration
 * Provides endpoints for organizational data extraction, email analysis, and Excel processing
 */

import { Router } from 'express';
import { spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { isAuthenticated } from '../replitAuth';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

interface IntegrationRequest {
  action: string;
  data: any;
  tenant_id: string;
  config?: {
    client_id?: string;
    client_secret?: string;
    tenant_id?: string;
    authority?: string;
    scopes?: string[];
  };
}

interface IntegrationResponse {
  success: boolean;
  data?: any;
  error?: string;
  processing_time_ms?: number;
}

/**
 * Execute Python integration agent command
 */
async function executeIntegrationAgent(request: IntegrationRequest): Promise<IntegrationResponse> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const pythonScript = path.join(__dirname, '../agents/integration_wrapper.py');
    
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
 * Initialize Microsoft Graph authentication
 */
router.post('/auth/initialize', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const { client_id, client_secret, ms_tenant_id, authority, scopes } = req.body;
    
    if (!client_id || !client_secret || !ms_tenant_id) {
      return res.status(400).json({ 
        error: 'Microsoft Graph credentials required: client_id, client_secret, ms_tenant_id' 
      });
    }

    const integrationRequest: IntegrationRequest = {
      action: 'initialize_auth',
      data: {},
      tenant_id: tenantId,
      config: {
        client_id,
        client_secret,
        tenant_id: ms_tenant_id,
        authority: authority || `https://login.microsoftonline.com/${ms_tenant_id}`,
        scopes: scopes || ['https://graph.microsoft.com/.default']
      }
    };

    const result = await executeIntegrationAgent(integrationRequest);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Microsoft Graph authentication initialized',
        authenticated: result.data.authenticated,
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error initializing Microsoft Graph auth:', error);
    res.status(500).json({ error: 'Failed to initialize Microsoft Graph authentication' });
  }
});

/**
 * Extract organizational users from Microsoft Graph
 */
router.post('/extract/users', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const integrationRequest: IntegrationRequest = {
      action: 'extract_users',
      data: req.body,
      tenant_id: tenantId
    };

    const result = await executeIntegrationAgent(integrationRequest);
    
    if (result.success) {
      res.json({
        success: true,
        users: result.data.users,
        user_count: result.data.user_count,
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error extracting organizational users:', error);
    res.status(500).json({ error: 'Failed to extract organizational users' });
  }
});

/**
 * Analyze email communication patterns
 */
router.post('/analyze/email-patterns', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const { days_back = 30 } = req.body;

    const integrationRequest: IntegrationRequest = {
      action: 'analyze_email_patterns',
      data: { days_back },
      tenant_id: tenantId
    };

    const result = await executeIntegrationAgent(integrationRequest);
    
    if (result.success) {
      res.json({
        success: true,
        patterns: result.data.patterns,
        pattern_count: result.data.pattern_count,
        analysis_summary: result.data.analysis_summary,
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error analyzing email patterns:', error);
    res.status(500).json({ error: 'Failed to analyze email communication patterns' });
  }
});

/**
 * Extract organizational relationships
 */
router.post('/extract/relationships', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const integrationRequest: IntegrationRequest = {
      action: 'extract_relationships',
      data: req.body,
      tenant_id: tenantId
    };

    const result = await executeIntegrationAgent(integrationRequest);
    
    if (result.success) {
      res.json({
        success: true,
        relationships: result.data.relationships,
        relationship_count: result.data.relationship_count,
        relationship_types: result.data.relationship_types,
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error extracting organizational relationships:', error);
    res.status(500).json({ error: 'Failed to extract organizational relationships' });
  }
});

/**
 * Process Excel file for dashboard insights
 */
router.post('/process/excel', isAuthenticated, upload.single('excel_file'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Excel file required' });
    }

    // Convert file buffer to base64 for Python processing
    const fileContent = req.file.buffer.toString('base64');
    
    const integrationRequest: IntegrationRequest = {
      action: 'process_excel',
      data: {
        file_content: fileContent,
        filename: req.file.originalname,
        mimetype: req.file.mimetype
      },
      tenant_id: tenantId
    };

    const result = await executeIntegrationAgent(integrationRequest);
    
    if (result.success) {
      res.json({
        success: true,
        insights: result.data.insights,
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error processing Excel file:', error);
    res.status(500).json({ error: 'Failed to process Excel file' });
  }
});

/**
 * Get integration summary and status
 */
router.get('/summary', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const integrationRequest: IntegrationRequest = {
      action: 'get_summary',
      data: {},
      tenant_id: tenantId
    };

    const result = await executeIntegrationAgent(integrationRequest);
    
    if (result.success) {
      res.json({
        success: true,
        summary: result.data,
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error getting integration summary:', error);
    res.status(500).json({ error: 'Failed to get integration summary' });
  }
});

/**
 * Test Microsoft Graph connectivity
 */
router.post('/test/connectivity', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const integrationRequest: IntegrationRequest = {
      action: 'test_connectivity',
      data: req.body,
      tenant_id: tenantId
    };

    const result = await executeIntegrationAgent(integrationRequest);
    
    if (result.success) {
      res.json({
        success: true,
        connectivity: result.data.connectivity,
        auth_status: result.data.auth_status,
        available_endpoints: result.data.available_endpoints,
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error testing Microsoft Graph connectivity:', error);
    res.status(500).json({ error: 'Failed to test Microsoft Graph connectivity' });
  }
});

/**
 * Sync organizational data to platform
 */
router.post('/sync/organization', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const { sync_users = true, sync_relationships = true, analyze_communications = false } = req.body;

    const integrationRequest: IntegrationRequest = {
      action: 'sync_organization',
      data: {
        sync_users,
        sync_relationships,
        analyze_communications
      },
      tenant_id: tenantId
    };

    const result = await executeIntegrationAgent(integrationRequest);
    
    if (result.success) {
      res.json({
        success: true,
        sync_results: result.data.sync_results,
        users_synced: result.data.users_synced,
        relationships_synced: result.data.relationships_synced,
        processing_time_ms: result.processing_time_ms
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('Error syncing organizational data:', error);
    res.status(500).json({ error: 'Failed to sync organizational data' });
  }
});

export default router;