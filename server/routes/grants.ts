import { Router, type Request, type Response } from 'express';

const router = Router();

// Get all grants for current tenant
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    
    // Return mock grant data for development
    const grants = {
      grants: [
        {
          id: '1',
          title: 'Innovation Accelerator Grant',
          amount: 50000,
          deadline: '2025-08-15T00:00:00Z',
          status: 'active',
          progress: 65,
          milestones: [
            { id: '1', title: 'Initial Planning', completed: true, dueDate: '2025-07-01' },
            { id: '2', title: 'Prototype Development', completed: false, dueDate: '2025-07-15' },
            { id: '3', title: 'Final Submission', completed: false, dueDate: '2025-08-10' }
          ]
        },
        {
          id: '2',
          title: 'Technology Innovation Fund',
          amount: 75000,
          deadline: '2025-09-30T00:00:00Z',
          status: 'submitted',
          progress: 100,
          milestones: []
        }
      ],
      total: 2,
      tenant_id: tenantId,
      timestamp: new Date().toISOString()
    };

    res.json(grants);
  } catch (error) {
    console.error('Error fetching grants:', error);
    res.status(500).json({ error: 'Failed to fetch grants' });
  }
});

// Get grant analytics
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    
    const analytics = {
      totalGrants: 89,
      activeGrants: 23,
      submittedGrants: 15,
      awardedGrants: 51,
      statusDistribution: {
        planning: 12,
        active: 23,
        submitted: 15,
        awarded: 51,
        rejected: 8
      },
      fundingTotals: {
        requested: 3000000,
        awarded: 2150000,
        pending: 890000
      },
      successRate: 87.2,
      averageAwardAmount: 42157,
      tenant_id: tenantId,
      timestamp: new Date().toISOString()
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching grant analytics:', error);
    res.status(500).json({ error: 'Failed to fetch grant analytics' });
  }
});

// Get specific grant details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    
    const grant = {
      id,
      title: 'Innovation Accelerator Grant',
      description: 'Advanced technology innovation program for startup acceleration',
      amount: 50000,
      deadline: '2025-08-15T00:00:00Z',
      status: 'active',
      progress: 65,
      timeline: {
        phases: [
          {
            id: '1',
            name: 'Planning Phase',
            startDate: '2025-06-01',
            endDate: '2025-07-01',
            status: 'completed'
          },
          {
            id: '2',
            name: 'Development Phase',
            startDate: '2025-07-01',
            endDate: '2025-08-01',
            status: 'active'
          },
          {
            id: '3',
            name: 'Submission Phase',
            startDate: '2025-08-01',
            endDate: '2025-08-15',
            status: 'pending'
          }
        ]
      },
      milestones: [
        {
          id: '1',
          title: 'Project Proposal Complete',
          dueDate: '2025-07-01',
          completed: true,
          completedDate: '2025-06-28'
        },
        {
          id: '2',
          title: 'Prototype Development',
          dueDate: '2025-07-15',
          completed: false
        },
        {
          id: '3',
          title: 'Testing and Validation',
          dueDate: '2025-08-01',
          completed: false
        },
        {
          id: '4',
          title: 'Final Documentation',
          dueDate: '2025-08-10',
          completed: false
        }
      ],
      requirements: [
        'Technical feasibility study',
        'Market analysis report',
        'Financial projections',
        'Team qualifications'
      ],
      tenant_id: tenantId,
      timestamp: new Date().toISOString()
    };

    res.json(grant);
  } catch (error) {
    console.error('Error fetching grant details:', error);
    res.status(500).json({ error: 'Failed to fetch grant details' });
  }
});

// Create new grant
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const grantData = req.body;
    
    // Generate automatic backwards planning timeline
    const timeline = generateBackwardsTimeline(grantData.deadline);
    
    const newGrant = {
      id: Date.now().toString(),
      ...grantData,
      timeline,
      status: 'planning',
      progress: 0,
      createdAt: new Date().toISOString(),
      tenant_id: tenantId
    };

    res.status(201).json(newGrant);
  } catch (error) {
    console.error('Error creating grant:', error);
    res.status(500).json({ error: 'Failed to create grant' });
  }
});

// Update grant progress
router.patch('/:id/progress', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { milestoneId, completed } = req.body;
    const tenantId = (req as any).tenantId;
    
    const updatedProgress = {
      grantId: id,
      milestoneId,
      completed,
      updatedAt: new Date().toISOString(),
      tenant_id: tenantId
    };

    res.json(updatedProgress);
  } catch (error) {
    console.error('Error updating grant progress:', error);
    res.status(500).json({ error: 'Failed to update grant progress' });
  }
});

// Generate backwards planning timeline
function generateBackwardsTimeline(deadline: string) {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const totalDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Generate 90/60/30-day milestones
  const milestones = [];
  
  if (totalDays > 90) {
    const day90 = new Date(deadlineDate.getTime() - (90 * 24 * 60 * 60 * 1000));
    milestones.push({
      id: 'milestone-90',
      title: '90-day Checkpoint',
      description: 'Initial project planning and team assembly',
      dueDate: day90.toISOString(),
      type: 'planning'
    });
  }
  
  if (totalDays > 60) {
    const day60 = new Date(deadlineDate.getTime() - (60 * 24 * 60 * 60 * 1000));
    milestones.push({
      id: 'milestone-60',
      title: '60-day Checkpoint',
      description: 'Development phase completion',
      dueDate: day60.toISOString(),
      type: 'development'
    });
  }
  
  if (totalDays > 30) {
    const day30 = new Date(deadlineDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    milestones.push({
      id: 'milestone-30',
      title: '30-day Checkpoint',
      description: 'Final testing and documentation',
      dueDate: day30.toISOString(),
      type: 'finalization'
    });
  }
  
  return {
    milestones,
    totalDays,
    generatedAt: new Date().toISOString()
  };
}

export default router;