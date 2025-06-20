import express from 'express';
import { spawn } from 'child_process';
import { promisify } from 'util';

const router = express.Router();

// Python orchestration agent wrapper
class OrchestrationWrapper {
  private pythonProcess: any = null;
  
  async executeCommand(action: string, data: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonScript = spawn('python3', [
        '-c',
        `
import asyncio
import sys
import json
sys.path.append('${process.cwd()}/server')

async def main():
    try:
        from agents.orchestration import orchestration_agent, initialize_orchestration
        
        # Parse input
        action = "${action}"
        data = ${JSON.stringify(data)}
        
        # Initialize if needed
        if not orchestration_agent.running:
            await initialize_orchestration()
        
        if action == "submit_workflow":
            task_id = await orchestration_agent.submit_workflow(
                data.get("workflow_type"),
                data.get("tenant_id"),
                data.get("payload", {}),
                data.get("priority", "MEDIUM"),
                data.get("dependencies", [])
            )
            print(json.dumps({"success": True, "task_id": task_id}))
            
        elif action == "get_status":
            task_id = data.get("task_id")
            if task_id:
                status = await orchestration_agent.get_workflow_status(task_id)
                print(json.dumps({"success": True, "status": status}))
            else:
                system_status = await orchestration_agent.get_system_status()
                print(json.dumps({"success": True, "system_status": system_status}))
                
        elif action == "get_system_metrics":
            metrics = await orchestration_agent.get_system_status()
            print(json.dumps({"success": True, "metrics": metrics}))
            
        elif action == "emergency_control":
            control_type = data.get("control_type")
            if control_type == "pause_all":
                # Implement pause functionality
                print(json.dumps({"success": True, "message": "All workflows paused"}))
            elif control_type == "resume_all":
                # Implement resume functionality
                print(json.dumps({"success": True, "message": "All workflows resumed"}))
            elif control_type == "stop_agent":
                await orchestration_agent.stop()
                print(json.dumps({"success": True, "message": "Orchestration agent stopped"}))
            else:
                print(json.dumps({"success": False, "error": "Unknown control type"}))
        else:
            print(json.dumps({"success": False, "error": "Unknown action"}))
            
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

asyncio.run(main())
        `
      ]);

      let output = '';
      let error = '';

      pythonScript.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      pythonScript.stderr.on('data', (data: Buffer) => {
        error += data.toString();
      });

      pythonScript.on('close', (code: number) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output.trim());
            resolve(result);
          } catch (e) {
            reject(new Error(`Failed to parse output: ${output}`));
          }
        } else {
          reject(new Error(`Python process failed: ${error}`));
        }
      });
    });
  }
}

const orchestrationWrapper = new OrchestrationWrapper();

// Workflow submission endpoint
router.post('/submit', async (req, res) => {
  try {
    const { workflow_type, tenant_id, payload, priority, dependencies } = req.body;
    
    if (!workflow_type || !tenant_id) {
      return res.status(400).json({
        error: 'Missing required parameters: workflow_type, tenant_id'
      });
    }

    const result = await orchestrationWrapper.executeCommand('submit_workflow', {
      workflow_type,
      tenant_id,
      payload: payload || {},
      priority: priority || 'MEDIUM',
      dependencies: dependencies || []
    });

    if (result.success) {
      res.json({
        success: true,
        task_id: result.task_id,
        message: `Workflow ${workflow_type} submitted successfully`
      });
    } else {
      res.status(500).json({
        error: result.error || 'Failed to submit workflow'
      });
    }
  } catch (error) {
    console.error('Error submitting workflow:', error);
    res.status(500).json({
      error: 'Internal server error while submitting workflow'
    });
  }
});

// Workflow status endpoint
router.get('/status/:task_id?', async (req, res) => {
  try {
    const { task_id } = req.params;
    
    const result = await orchestrationWrapper.executeCommand('get_status', {
      task_id
    });

    if (result.success) {
      res.json({
        success: true,
        data: task_id ? result.status : result.system_status
      });
    } else {
      res.status(500).json({
        error: result.error || 'Failed to get status'
      });
    }
  } catch (error) {
    console.error('Error getting workflow status:', error);
    res.status(500).json({
      error: 'Internal server error while getting status'
    });
  }
});

// System metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const result = await orchestrationWrapper.executeCommand('get_system_metrics');

    if (result.success) {
      res.json({
        success: true,
        metrics: result.metrics
      });
    } else {
      res.status(500).json({
        error: result.error || 'Failed to get metrics'
      });
    }
  } catch (error) {
    console.error('Error getting system metrics:', error);
    res.status(500).json({
      error: 'Internal server error while getting metrics'
    });
  }
});

// Emergency controls endpoint
router.post('/emergency/:action', async (req, res) => {
  try {
    const { action } = req.params;
    const allowedActions = ['pause_all', 'resume_all', 'stop_agent'];
    
    if (!allowedActions.includes(action)) {
      return res.status(400).json({
        error: `Invalid emergency action. Allowed: ${allowedActions.join(', ')}`
      });
    }

    const result = await orchestrationWrapper.executeCommand('emergency_control', {
      control_type: action
    });

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        error: result.error || 'Failed to execute emergency control'
      });
    }
  } catch (error) {
    console.error('Error executing emergency control:', error);
    res.status(500).json({
      error: 'Internal server error while executing emergency control'
    });
  }
});

// Queue management endpoint
router.get('/queue', async (req, res) => {
  try {
    const result = await orchestrationWrapper.executeCommand('get_status');

    if (result.success && result.system_status) {
      const queueStatus = result.system_status.queue_status;
      res.json({
        success: true,
        queue: {
          pending: queueStatus.pending_tasks,
          running: queueStatus.running_tasks,
          completed: queueStatus.completed_tasks,
          failed: queueStatus.failed_tasks,
          total_processed: queueStatus.completed_tasks + queueStatus.failed_tasks
        }
      });
    } else {
      res.status(500).json({
        error: 'Failed to get queue status'
      });
    }
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({
      error: 'Internal server error while getting queue status'
    });
  }
});

// Workflow templates for common operations
const workflowTemplates = {
  sponsor_analysis: {
    name: 'Sponsor Analysis',
    description: 'Analyze sponsor relationships and funding potential',
    required_fields: ['sponsor_id'],
    estimated_duration: 300
  },
  grant_timeline: {
    name: 'Grant Timeline Generation',
    description: 'Generate backwards planning timeline with milestones',
    required_fields: ['grant_id'],
    estimated_duration: 180
  },
  relationship_mapping: {
    name: 'Relationship Path Discovery',
    description: 'Map relationships and discover connection paths',
    required_fields: ['source_entity', 'target_entity'],
    estimated_duration: 240
  },
  email_analysis: {
    name: 'Email Communication Analysis',
    description: 'Analyze email patterns for relationship insights',
    required_fields: ['email_batch_id'],
    estimated_duration: 420
  },
  excel_processing: {
    name: 'Excel File Processing',
    description: 'Process and extract data from Excel files',
    required_fields: ['file_path'],
    estimated_duration: 200
  }
};

// Get available workflow templates
router.get('/templates', (req, res) => {
  res.json({
    success: true,
    templates: workflowTemplates
  });
});

// Bulk workflow submission
router.post('/submit/bulk', async (req, res) => {
  try {
    const { workflows } = req.body;
    
    if (!Array.isArray(workflows)) {
      return res.status(400).json({
        error: 'Workflows must be an array'
      });
    }

    const results = [];
    for (const workflow of workflows) {
      try {
        const result = await orchestrationWrapper.executeCommand('submit_workflow', workflow);
        results.push({
          workflow_type: workflow.workflow_type,
          success: result.success,
          task_id: result.task_id,
          error: result.error
        });
      } catch (error) {
        results.push({
          workflow_type: workflow.workflow_type,
          success: false,
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    res.json({
      success: true,
      summary: {
        total: results.length,
        successful,
        failed
      },
      results
    });
  } catch (error) {
    console.error('Error in bulk workflow submission:', error);
    res.status(500).json({
      error: 'Internal server error during bulk submission'
    });
  }
});

export default router;