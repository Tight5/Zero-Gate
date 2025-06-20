import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import multer from 'multer';
import fs from 'fs/promises';
import { isAuthenticated } from '../replitAuth';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel files
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/excel'
    ];
    
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Execute Python integration command
async function executeIntegrationCommand(operation: string, data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const scriptPath = path.join(__dirname, '../agents/integration_wrapper.py');
    
    const commandData = JSON.stringify({
      operation,
      data
    });
    
    const pythonProcess = spawn(pythonPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${error}`));
        }
      } else {
        reject(new Error(`Python process failed with code ${code}: ${stderr}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
    
    // Send command data to Python process
    pythonProcess.stdin.write(commandData);
    pythonProcess.stdin.end();
  });
}

// Get Microsoft Graph connection status
router.get('/connection-status', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    const result = await executeIntegrationCommand('get_connection_status', {
      tenant_id: tenantId
    });
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to check connection status',
        details: result.error 
      });
    }
  } catch (error) {
    console.error('Error checking connection status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test Microsoft Graph authentication
router.post('/test-auth', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    const result = await executeIntegrationCommand('get_access_token', {
      tenant_id: tenantId
    });
    
    if (result.success) {
      res.json({
        authenticated: result.data.has_token,
        status: result.data.status,
        message: result.data.has_token ? 'Successfully authenticated with Microsoft Graph' : 'Authentication failed'
      });
    } else {
      res.status(401).json({ 
        authenticated: false,
        error: 'Authentication failed',
        details: result.error 
      });
    }
  } catch (error) {
    console.error('Error testing authentication:', error);
    res.status(500).json({ 
      authenticated: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Extract organizational relationships
router.post('/extract-relationships', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { user_limit = 100 } = req.body;
    
    const result = await executeIntegrationCommand('extract_organizational_relationships', {
      tenant_id: tenantId,
      user_limit: parseInt(user_limit)
    });
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to extract organizational relationships',
        details: result.error 
      });
    }
  } catch (error) {
    console.error('Error extracting relationships:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Analyze email communication patterns
router.post('/analyze-communication', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { user_id, days = 30 } = req.body;
    
    const result = await executeIntegrationCommand('analyze_email_communication_patterns', {
      tenant_id: tenantId,
      user_id,
      days: parseInt(days)
    });
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to analyze communication patterns',
        details: result.error 
      });
    }
  } catch (error) {
    console.error('Error analyzing communication:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Process Excel file for dashboard data
router.post('/process-excel', isAuthenticated, upload.single('excel_file'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No Excel file uploaded' });
    }
    
    // Process the uploaded file
    const result = await executeIntegrationCommand('process_excel_file_for_dashboard', {
      tenant_id: tenantId,
      file_path: file.path
    });
    
    // Clean up uploaded file
    try {
      await fs.unlink(file.path);
    } catch (cleanupError) {
      console.warn('Failed to cleanup uploaded file:', cleanupError);
    }
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to process Excel file',
        details: result.error 
      });
    }
  } catch (error) {
    console.error('Error processing Excel file:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Process Excel file from base64 content
router.post('/process-excel-content', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { file_content, filename } = req.body;
    
    if (!file_content) {
      return res.status(400).json({ error: 'No file content provided' });
    }
    
    const result = await executeIntegrationCommand('process_excel_file_for_dashboard', {
      tenant_id: tenantId,
      file_content,
      filename
    });
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to process Excel content',
        details: result.error 
      });
    }
  } catch (error) {
    console.error('Error processing Excel content:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get integration agent status and capabilities
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    // Check connection status
    const connectionResult = await executeIntegrationCommand('get_connection_status', {
      tenant_id: tenantId
    });
    
    // Check authentication status  
    const authResult = await executeIntegrationCommand('get_access_token', {
      tenant_id: tenantId
    });
    
    const status = {
      integration_agent: 'active',
      microsoft_graph: {
        connected: connectionResult.success && connectionResult.data?.authenticated,
        authenticated: authResult.success && authResult.data?.has_token,
        status: connectionResult.data?.status || 'unknown',
        last_checked: new Date().toISOString()
      },
      capabilities: {
        organizational_relationships: true,
        email_communication_analysis: true,
        excel_file_processing: true,
        file_upload_support: true
      },
      supported_operations: [
        'extract_organizational_relationships',
        'analyze_email_communication_patterns', 
        'process_excel_file_for_dashboard',
        'get_connection_status'
      ]
    };
    
    res.json(status);
  } catch (error) {
    console.error('Error getting integration status:', error);
    res.status(500).json({ 
      error: 'Failed to get integration status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'integration-agent',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;