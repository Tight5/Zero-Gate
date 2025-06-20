import type { Express, Request, Response } from "express";
import { spawn } from "child_process";
import path from "path";
import { isAuthenticated } from "../replitAuth";

interface ProcessingRequest extends Request {
  body: {
    source?: string;
    target?: string;
    tenant_id?: string;
    max_depth?: number;
    relationship_type?: string;
    strength?: number;
    metadata?: any;
    sponsor_data?: any;
    grant_deadline?: string;
    grant_type?: string;
    sponsors?: any[];
    entities?: string[];
  };
}

// Python wrapper for ProcessingAgent operations
async function callProcessingAgent(operation: string, data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const scriptPath = path.join(process.cwd(), 'server', 'agents', 'processing_wrapper.py');
    
    const pythonProcess = spawn(pythonPath, [scriptPath, operation]);
    
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
        reject(new Error(`Python process failed: ${stderr}`));
      }
    });
    
    // Send input data to Python process
    pythonProcess.stdin.write(JSON.stringify(data));
    pythonProcess.stdin.end();
  });
}

export function registerProcessingRoutes(app: Express) {
  // Add relationship to graph
  app.post('/api/processing/relationships', isAuthenticated, async (req: ProcessingRequest, res: Response) => {
    try {
      const { source, target, relationship_type, strength, tenant_id, metadata } = req.body;
      
      if (!source || !target || !relationship_type || !tenant_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: source, target, relationship_type, tenant_id' 
        });
      }
      
      const result = await callProcessingAgent('add_relationship', {
        source,
        target,
        relationship_type,
        strength: strength || 0.5,
        tenant_id,
        metadata: metadata || {}
      });
      
      res.json({
        success: true,
        message: 'Relationship added successfully',
        data: result
      });
    } catch (error) {
      console.error('Error adding relationship:', error);
      res.status(500).json({ 
        error: 'Failed to add relationship',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Find relationship path between two individuals
  app.post('/api/processing/path-discovery', isAuthenticated, async (req: ProcessingRequest, res: Response) => {
    try {
      const { source, target, tenant_id, max_depth = 7 } = req.body;
      
      if (!source || !target || !tenant_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: source, target, tenant_id' 
        });
      }
      
      const result = await callProcessingAgent('find_relationship_path', {
        source,
        target,
        tenant_id,
        max_depth
      });
      
      if (!result.path) {
        return res.json({
          found: false,
          message: `No path found between ${source} and ${target} within ${max_depth} degrees`,
          source,
          target,
          max_depth
        });
      }
      
      // Get path analysis
      const analysis = await callProcessingAgent('analyze_relationship_strength', {
        path: result.path,
        tenant_id
      });
      
      res.json({
        found: true,
        path: result.path,
        analysis,
        source,
        target,
        degrees: result.path.length - 1
      });
    } catch (error) {
      console.error('Error finding relationship path:', error);
      res.status(500).json({ 
        error: 'Failed to find relationship path',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Find all paths within specified degrees
  app.post('/api/processing/all-paths', isAuthenticated, async (req: ProcessingRequest, res: Response) => {
    try {
      const { source, target, tenant_id, max_depth = 7 } = req.body;
      
      if (!source || !target || !tenant_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: source, target, tenant_id' 
        });
      }
      
      const result = await callProcessingAgent('find_all_paths_within_degrees', {
        source,
        target,
        tenant_id,
        max_depth
      });
      
      // Analyze each path
      const analyzedPaths = [];
      for (const path of result.paths || []) {
        const analysis = await callProcessingAgent('analyze_relationship_strength', {
          path,
          tenant_id
        });
        
        analyzedPaths.push({
          path,
          analysis,
          degrees: path.length - 1
        });
      }
      
      res.json({
        found: analyzedPaths.length > 0,
        paths: analyzedPaths,
        total_paths: analyzedPaths.length,
        source,
        target
      });
    } catch (error) {
      console.error('Error finding all paths:', error);
      res.status(500).json({ 
        error: 'Failed to find all paths',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Calculate sponsor metrics
  app.post('/api/processing/sponsor-metrics', isAuthenticated, async (req: ProcessingRequest, res: Response) => {
    try {
      const { sponsor_data, tenant_id } = req.body;
      
      if (!sponsor_data || !tenant_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: sponsor_data, tenant_id' 
        });
      }
      
      const result = await callProcessingAgent('calculate_sponsor_metrics', {
        sponsor_data,
        tenant_id
      });
      
      res.json({
        success: true,
        metrics: result,
        calculated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error calculating sponsor metrics:', error);
      res.status(500).json({ 
        error: 'Failed to calculate sponsor metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Generate grant timeline with backwards planning
  app.post('/api/processing/grant-timeline', isAuthenticated, async (req: ProcessingRequest, res: Response) => {
    try {
      const { grant_deadline, grant_type, tenant_id } = req.body;
      
      if (!grant_deadline || !grant_type || !tenant_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: grant_deadline, grant_type, tenant_id' 
        });
      }
      
      const result = await callProcessingAgent('generate_grant_timeline', {
        grant_deadline,
        grant_type,
        tenant_id
      });
      
      res.json({
        success: true,
        timeline: result,
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating grant timeline:', error);
      res.status(500).json({ 
        error: 'Failed to generate grant timeline',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get network statistics for tenant
  app.get('/api/processing/network-stats/:tenant_id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { tenant_id } = req.params;
      
      if (!tenant_id) {
        return res.status(400).json({ 
          error: 'Missing tenant_id parameter' 
        });
      }
      
      const result = await callProcessingAgent('get_network_statistics', {
        tenant_id
      });
      
      res.json({
        success: true,
        statistics: result,
        tenant_id,
        calculated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting network statistics:', error);
      res.status(500).json({ 
        error: 'Failed to get network statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Batch process multiple sponsors
  app.post('/api/processing/batch-sponsor-metrics', isAuthenticated, async (req: ProcessingRequest, res: Response) => {
    try {
      const { sponsors, tenant_id } = req.body;
      
      if (!sponsors || !Array.isArray(sponsors) || !tenant_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: sponsors (array), tenant_id' 
        });
      }
      
      const results = [];
      
      for (const sponsor_data of sponsors) {
        try {
          const metrics = await callProcessingAgent('calculate_sponsor_metrics', {
            sponsor_data,
            tenant_id
          });
          
          results.push({
            sponsor_id: sponsor_data.id || 'unknown',
            success: true,
            metrics
          });
        } catch (error) {
          results.push({
            sponsor_id: sponsor_data.id || 'unknown',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      res.json({
        success: true,
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
        processed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing batch sponsor metrics:', error);
      res.status(500).json({ 
        error: 'Failed to process batch sponsor metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Update landmarks for pathfinding optimization
  app.post('/api/processing/update-landmarks', isAuthenticated, async (req: ProcessingRequest, res: Response) => {
    try {
      const { tenant_id } = req.body;
      
      const result = await callProcessingAgent('update_landmarks', {
        tenant_id
      });
      
      res.json({
        success: true,
        message: 'Landmarks updated successfully',
        landmarks_count: result.landmarks_count || 0,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating landmarks:', error);
      res.status(500).json({ 
        error: 'Failed to update landmarks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get relationship analysis between specific entities
  app.post('/api/processing/relationship-analysis', isAuthenticated, async (req: ProcessingRequest, res: Response) => {
    try {
      const { entities, tenant_id } = req.body;
      
      if (!entities || !Array.isArray(entities) || entities.length < 2 || !tenant_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: entities (array with at least 2 items), tenant_id' 
        });
      }
      
      const analysis = [];
      
      // Analyze relationships between all pairs
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const source = entities[i];
          const target = entities[j];
          
          try {
            const pathResult = await callProcessingAgent('find_relationship_path', {
              source,
              target,
              tenant_id,
              max_depth: 7
            });
            
            if (pathResult.path) {
              const strengthAnalysis = await callProcessingAgent('analyze_relationship_strength', {
                path: pathResult.path,
                tenant_id
              });
              
              analysis.push({
                source,
                target,
                connected: true,
                path: pathResult.path,
                degrees: pathResult.path.length - 1,
                analysis: strengthAnalysis
              });
            } else {
              analysis.push({
                source,
                target,
                connected: false,
                path: null,
                degrees: null,
                analysis: null
              });
            }
          } catch (error) {
            analysis.push({
              source,
              target,
              connected: false,
              path: null,
              degrees: null,
              analysis: null,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
      
      const connected_pairs = analysis.filter(a => a.connected).length;
      const total_pairs = analysis.length;
      
      res.json({
        success: true,
        entities,
        total_pairs,
        connected_pairs,
        connectivity_rate: total_pairs > 0 ? connected_pairs / total_pairs : 0,
        analysis,
        analyzed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error analyzing relationships:', error);
      res.status(500).json({ 
        error: 'Failed to analyze relationships',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Health check endpoint
  app.get('/api/processing/health', async (req: Request, res: Response) => {
    try {
      const result = await callProcessingAgent('health_check', {});
      
      res.json({
        status: 'healthy',
        processing_agent: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });
}